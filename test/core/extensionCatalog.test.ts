import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { extensionCatalog, installExtension, isNewer, needsConfirmation, updateExtension } from "../../src/core/extensionCatalog.js";
import { addMarketplace } from "../../src/core/marketplaces.js";
import { listInstalled, readLock, setExtensionOptions } from "../../src/core/externalExtensions.js";
import { extensionDataDir } from "../../src/core/externalExtensions.js";
import { runExtensionCommand } from "../../src/tui/extensionCommand.js";
import { createChatController, type ChatSettings } from "../../src/chat/chatController.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";
import type { AgentEvent, AgentRun } from "../../src/core/runner.js";
import { setLanguage } from "../../src/core/messages/index.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "extension-catalog-test-"));

/** A folder marketplace, `name`, offering `dice` (at `version`, with an option) and `cards`. */
function makeMarketplace(name: string, version = "1.0.0"): string {
  const root = path.join(temp(), name);
  fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({
      name,
      owner: { name: "Ada" },
      plugins: [
        { name: "dice", source: "./dice", description: "Rolls dice.", tags: ["games"] },
        { name: "cards", source: "./cards", description: "Deals cards." },
      ],
    }),
  );
  for (const plugin of ["dice", "cards"]) {
    fs.mkdirSync(path.join(root, plugin, ".claude-plugin"), { recursive: true });
    fs.writeFileSync(
      path.join(root, plugin, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: plugin, version, description: `The ${plugin}.`, userConfig: { sides: { type: "number", title: "Sides", description: "How many." } } }),
    );
  }
  return root;
}

/** Makes the folder marketplace offer `version` of its plugins. */
function bump(root: string, version: string): void {
  for (const plugin of ["dice", "cards"]) {
    const file = path.join(root, plugin, ".claude-plugin", "plugin.json");
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, "utf8")), version }));
  }
}

test("a version is newer only when it compares as x.y.z", () => {
  assert.equal(isNewer("1.2.0", "1.1.9"), true);
  assert.equal(isNewer("1.1.0", "1.1.0"), false);
  assert.equal(isNewer("1.0.0", "1.1.0"), false);
  assert.equal(isNewer(undefined, "1.0.0"), false);
  assert.equal(isNewer("next", "1.0.0"), false);
});

test("the catalog lists what the marketplaces offer, the official one known without asking; installing and updating keep data and options", async () => {
  const official = makeMarketplace("shipyard");
  const dirs = { agent: path.join(temp(), "extensions") };
  // Another marketplace, added by hand: installing from it needs the person's word.
  await addMarketplace(makeMarketplace("harbor"), dirs.agent);

  const all = await extensionCatalog(dirs, { official });
  assert.deepEqual(all.map((entry) => `${entry.spec} ${entry.version} ${entry.official}`).sort(), ["cards@harbor 1.0.0 false", "cards@shipyard 1.0.0 true", "dice@harbor 1.0.0 false", "dice@shipyard 1.0.0 true"]);
  assert.deepEqual((await extensionCatalog(dirs, { official, words: ["games"] })).map((entry) => entry.spec).sort(), ["dice@harbor", "dice@shipyard"]);
  assert.equal(await needsConfirmation(dirs, "dice@shipyard", official), undefined);
  assert.equal((await needsConfirmation(dirs, "cards@harbor", official))?.marketplace.name, "harbor");

  const installed = await installExtension(dirs, "dice@shipyard", { official });
  assert.deepEqual([installed.name, installed.scope], ["dice", "agent"]);
  await setExtensionOptions(dirs.agent, "dice", { sides: "20" });
  fs.mkdirSync(extensionDataDir(dirs.agent, "dice"), { recursive: true });
  fs.writeFileSync(path.join(extensionDataDir(dirs.agent, "dice"), "rolls.txt"), "6");
  let dice = (await extensionCatalog(dirs, { official })).find((entry) => entry.spec === "dice@shipyard")!;
  assert.equal(dice.installed?.name, "dice");
  assert.equal(dice.update, false);

  // A newer version in the official marketplace: the official one is copied afresh, so it shows.
  bump(official, "1.1.0");
  dice = (await extensionCatalog(dirs, { official })).find((entry) => entry.spec === "dice@shipyard")!;
  assert.equal(dice.update, true);
  // The other marketplace's dice isn't the one installed: no update offered there.
  assert.equal((await extensionCatalog(dirs, { official })).find((entry) => entry.spec === "dice@harbor")!.update, false);
  const updated = await updateExtension(dirs, "dice", { official });
  assert.deepEqual([updated.from, updated.to], ["1.0.0", "1.1.0"]);
  assert.equal((await readLock(dirs.agent)).dice!.options!.sides, 20);
  assert.equal(fs.readFileSync(path.join(extensionDataDir(dirs.agent, "dice"), "rolls.txt"), "utf8"), "6");
  assert.equal((await listInstalled(dirs))[0]!.manifest!.version, "1.1.0");
});

test("extension update updates what has a newer version, and says when nothing has", async () => {
  const official = makeMarketplace("shipyard");
  const dirs = { agent: path.join(temp(), "extensions") };
  const lines: string[] = [];
  const run = (...argv: string[]) => runExtensionCommand(["extension", ...argv], { dirs, official, command: "agent", write: (line) => lines.push(line), ask: async () => "" });
  await run("add", "dice@shipyard");
  await run("update");
  assert.equal(lines.at(-1), "Every extension from a marketplace is up to date.");
  bump(official, "2.0.0");
  await run("search", "dice");
  assert.equal(lines.at(-1), "dice@shipyard 2.0.0 (installed: 1.0.0, update available)  Rolls dice.");
  await run("update");
  assert.match(lines.at(-1)!, /^Updated dice \(1\.0\.0 → 2\.0\.0\) in the agent scope: its data and options kept\./);
});

const turnEnd: AgentEvent = { type: "turn-end", status: "success", failed: false, resultText: null, errorText: "" };
const quietAgent: NonNullable<ChatSettings["runQuery"]> = (prompt: AsyncIterable<SDKUserMessage>): AgentRun => ({
  events: (async function* () {
    // Each message the person sends, answered with an empty turn.
    const messages = prompt[Symbol.asyncIterator]();
    while (!(await messages.next()).done) yield turnEnd;
  })(),
  interrupt: async () => undefined,
  close: () => undefined,
  supportedCommands: async () => [],
  contextUsage: async () => null,
});

test("the chat installs, updates and removes from the catalog, asks before another marketplace's, and reopens on /extensions reload", async () => {
  setLanguage("en");
  const official = makeMarketplace("shipyard");
  const projectDir = temp();
  const dirs = { agent: path.join(projectDir, "extensions") };
  await addMarketplace(makeMarketplace("harbor"), dirs.agent);
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
  let opened = 0;
  const controller = await createChatController(
    async (run) => {
      opened++;
      return buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs, officialMarketplace: official }, run.dir, spec, { run });
    },
    { runsDir: temp(), promptSuggestions: false, runQuery: quietAgent },
  );
  await controller.start();
  const notices = () => controller.getState().transcript.flatMap((entry) => (entry.kind === "notice" ? [entry.text] : []));

  await controller.send("/extensions search games");
  assert.ok(notices().includes("  dice@shipyard 1.0.0  Rolls dice."), notices().join("\n"));
  // The official one installs; the running session is untouched until it's reopened.
  await controller.send("/extensions install dice@shipyard");
  assert.match(notices().at(-1)!, /dice installed: it's there in a new conversation, or now with \/extensions reload/);
  assert.ok(controller.getState().extensions?.installed.some((extension) => extension.name === "dice"));
  assert.deepEqual(controller.getState().extensions?.active, []);
  assert.equal(opened, 1);
  await controller.send("/extensions reload");
  assert.equal(opened, 2);
  assert.deepEqual(controller.getState().extensions?.active, ["dice"]);

  // Another marketplace's waits for the person's word.
  assert.deepEqual(await controller.installExtension("cards@harbor"), { confirm: { marketplace: "harbor", description: "Deals cards." } });
  assert.equal(controller.getState().extensions?.installed.some((extension) => extension.name === "cards"), false);
  await controller.send("/extensions install cards@harbor");
  assert.match(notices().at(-1)!, /cards@harbor comes from harbor, not this agent's own marketplace/);
  await controller.send("/extensions install cards@harbor --yes");
  assert.ok(controller.getState().extensions?.installed.some((extension) => extension.name === "cards"));

  // A form sets a secret-free option of one installed but not running: the session reopens with it.
  assert.deepEqual((await controller.extensionOptions("cards")).map((state) => state.key), ["sides"]);
  await controller.setExtensionOptions("cards", { sides: "52" });
  assert.equal((await readLock(dirs.agent)).cards!.options!.sides, 52);
  assert.equal(opened, 3);

  bump(official, "1.2.0");
  assert.deepEqual(await controller.updateExtension(), ["dice"]);
  assert.match(notices().at(-1)!, /dice updated, 1\.0\.0 → 1\.2\.0/);

  // Removing one that's running: off in the session first (here the session isn't running
  // through runQuery, so it can't be switched live: it opens again), then gone.
  await controller.send("/extensions remove dice");
  assert.equal(controller.getState().extensions?.installed.some((extension) => extension.name === "dice"), false);
  assert.equal(controller.getState().extensions?.active.includes("dice"), false);
  assert.equal(controller.getState().extensions?.inactive.some((off) => off.name === "dice"), false);
  controller.close();
});

test("an entry's topics and look: keywords, tags and category; a logo or banner only inside its folder; an agent's topics filter what it offers", async () => {
  const root = path.join(temp(), "harbor");
  fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "harbor", owner: { name: "Ada" }, plugins: [{ name: "campus", source: "./campus", category: "Education", tags: ["Moodle", "miyagi"] }, { name: "notes", source: "./notes", tags: ["notes"] }] }),
  );
  const look = { logo: "assets/logo.svg", banner: "../outside.png" };
  const grading = { id: "lms-grading", texts: { en: { label: "Grading with rubrics", description: "Proposals first." }, es: { label: "Corregir con rúbricas", description: "Primero las propuestas." } } };
  for (const [name, manifest] of [["campus", { keywords: ["lms", "moodle"], metadata: { "agent-kit": { catalog: look, capabilities: [grading] } } }], ["notes", {}]] as const) {
    fs.mkdirSync(path.join(root, name, ".claude-plugin"), { recursive: true });
    fs.writeFileSync(path.join(root, name, ".claude-plugin", "plugin.json"), JSON.stringify({ name, version: "1.0.0", description: name, ...manifest }));
  }
  fs.mkdirSync(path.join(root, "campus", "assets"));
  fs.writeFileSync(path.join(root, "campus", "assets", "logo.svg"), "<svg/>");
  fs.writeFileSync(path.join(root, "outside.png"), "");
  const dirs = { agent: path.join(temp(), "extensions") };
  await addMarketplace(root, dirs.agent);

  const all = await extensionCatalog(dirs);
  const campus = all.find((entry) => entry.plugin.name === "campus")!;
  assert.deepEqual(campus.topics, ["lms", "moodle", "miyagi", "education"]);
  assert.ok(campus.logo?.endsWith(path.join("campus", "assets", "logo.svg")));
  // A banner outside its folder isn't shown.
  assert.equal(campus.banner, undefined);
  assert.equal(all.find((entry) => entry.plugin.name === "notes")!.logo, undefined);
  // An agent offering only its topic's; words match topics too.
  assert.deepEqual((await extensionCatalog(dirs, { topics: ["Miyagi"] })).map((entry) => entry.plugin.name), ["campus"]);
  assert.deepEqual((await extensionCatalog(dirs, { words: ["education"] })).map((entry) => entry.plugin.name), ["campus"]);
  // What it lets the agent do (#62), in the kit's language, and found by a search.
  assert.deepEqual(campus.capabilities, [{ id: "lms-grading", label: "Grading with rubrics", description: "Proposals first." }]);
  assert.deepEqual(all.find((entry) => entry.plugin.name === "notes")!.capabilities, []);
  setLanguage("es");
  try {
    assert.deepEqual((await extensionCatalog(dirs, { words: ["rúbricas"] })).map((entry) => [entry.plugin.name, entry.capabilities[0]?.label]), [["campus", "Corregir con rúbricas"]]);
  } finally {
    setLanguage("en");
  }
});

test("the chat's catalog offers only the agent's catalogTopics, and serves an entry's images", async () => {
  const official = makeMarketplace("shipyard");
  const root = official;
  const manifest = path.join(root, ".claude-plugin", "marketplace.json");
  const market = JSON.parse(fs.readFileSync(manifest, "utf8"));
  market.plugins[0].tags = ["games", "miyagi"];
  fs.writeFileSync(manifest, JSON.stringify(market));
  const projectDir = temp();
  const dirs = { agent: path.join(projectDir, "extensions") };
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
  const controller = await createChatController((run) => buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs, officialMarketplace: official, catalogTopics: ["miyagi"] }, run.dir, spec, { run }), {
    runsDir: temp(),
    promptSuggestions: false,
    runQuery: quietAgent,
  });
  try {
    assert.deepEqual((await controller.extensionCatalog()).map((entry) => entry.plugin.name), ["dice"]);
    assert.equal(await controller.extensionImage("dice@shipyard", "logo"), undefined);
  } finally {
    controller.close();
  }
});
