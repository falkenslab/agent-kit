import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addExtension, setExtensionEnabled } from "../../src/core/externalExtensions.js";
import { mountPlugin, unmountPlugin } from "../../src/core/liveExtensions.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { sessionViewOf } from "../../src/core/sessionFacts.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "live-extensions-test-"));

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "BASE PROMPT",
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
  replyInLanguage: false,
};

/** An installed extension with a read-only tool, a label, a skill and a subagent. */
function makeExtension(name: string): string {
  const dir = path.join(temp(), name);
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.mkdirSync(path.join(dir, "skills", "roll-many"), { recursive: true });
  fs.mkdirSync(path.join(dir, "agents"));
  fs.writeFileSync(
    path.join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name, description: "Rolls dice.", "agent-kit": { readOnlyTools: ["roll"], labels: { roll: { en: { label: "Rolling" } } }, help: "Dice: `roll` rolls one." } }),
  );
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { [name]: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs"] } } }));
  fs.writeFileSync(path.join(dir, "server.mjs"), "// a server\n");
  fs.writeFileSync(path.join(dir, "skills", "roll-many", "SKILL.md"), "---\nname: roll-many\ndescription: Rolls many.\n---\n\nRoll.");
  fs.writeFileSync(path.join(dir, "agents", "croupier.md"), "---\nname: croupier\ndescription: Deals.\ntools: [Read]\n---\n\nYou deal.");
  return dir;
}

async function session() {
  const projectDir = temp();
  const scope = path.join(projectDir, "extensions");
  await addExtension(makeExtension("dice"), scope);
  const runDir = temp();
  const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: { agent: scope } }, runDir, spec);
  const calls: string[] = [];
  sessionViewOf(built.options)!.attach({
    toggleMcpServer: async (server, enabled) => void calls.push(`${server}:${enabled ? "on" : "off"}`),
    reloadPlugins: async () => void calls.push("reload"),
  });
  return { built, calls, scope, mount: path.join(runDir, "extensions", "dice") };
}

test("an installed extension is turned off and on in the running session: its servers, its mounted plugin and the kit's lists", async () => {
  const { built, calls, scope, mount } = await session();
  // Its plugin is a link to what's installed: nothing copied.
  assert.ok(fs.lstatSync(mount).isSymbolicLink());
  const facts = async () => (await sessionViewOf(built.options)!.facts()).extensions;
  assert.ok(built.toolLabels.mcp__dice__roll);
  assert.deepEqual(built.extensions.active, ["dice"]);

  assert.equal(await built.switchExtension("dice", false), true);
  assert.deepEqual(calls, ["reload", "dice:off"]);
  assert.ok(!fs.existsSync(mount)); // its skills, commands and subagents gone at the reload
  assert.ok(fs.existsSync(path.join(scope, "dice", "skills", "roll-many", "SKILL.md"))); // the link went, not what's installed
  assert.equal(built.toolLabels.mcp__dice__roll, undefined);
  assert.deepEqual(built.extensions.active, []);
  assert.deepEqual(built.extensions.inactive, [{ name: "dice", reason: "was turned off in this session" }]);
  assert.deepEqual((await facts()).active.map((extension) => extension.name), []);
  assert.deepEqual((await facts()).inactive, [{ name: "dice", reason: "was turned off in this session" }]);
  assert.equal(await built.switchExtension("dice", false), true); // already off: nothing more
  assert.equal(calls.length, 2);

  assert.equal(await built.switchExtension("dice", true), true);
  assert.deepEqual(calls.slice(2), ["reload", "dice:on"]);
  assert.ok(fs.existsSync(path.join(mount, "skills", "roll-many", "SKILL.md")));
  assert.ok(built.toolLabels.mcp__dice__roll);
  assert.deepEqual(built.extensions.active, ["dice"]);
  assert.deepEqual(built.extensions.inactive, []);
  assert.deepEqual((await facts()).active.map((extension) => extension.name), ["dice"]);
});

test("turning on takes opening the session again when the extension wasn't running, its files changed, or the session hasn't started", async () => {
  const { built, scope } = await session();
  assert.equal(await built.switchExtension("cards", true), false); // not running when the session opened

  await built.switchExtension("dice", false);
  fs.writeFileSync(path.join(scope, "dice", "server.mjs"), "// changed\n");
  assert.equal(await built.switchExtension("dice", true), false); // its files changed: a new session judges them

  const projectDir = temp();
  const other = path.join(projectDir, "extensions");
  await addExtension(makeExtension("dice"), other);
  await setExtensionEnabled(other, "dice", true);
  const fresh = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: { agent: other } }, temp(), spec);
  assert.equal(await fresh.switchExtension("dice", false), false); // no running session to switch it in
});

test("a linked extension turns on again after a rebuild, with its new files: it's being developed", async () => {
  const projectDir = temp();
  const scope = path.join(projectDir, "extensions");
  const source = makeExtension("dice");
  await addExtension(source, scope, { link: true });
  const runDir = temp();
  const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: { agent: scope } }, runDir, spec);
  const calls: string[] = [];
  sessionViewOf(built.options)!.attach({
    toggleMcpServer: async (server, enabled) => void calls.push(`${server}:${enabled ? "on" : "off"}`),
    reloadPlugins: async () => void calls.push("reload"),
  });
  assert.equal(await built.switchExtension("dice", false), true);
  fs.writeFileSync(path.join(source, "skills", "roll-many", "SKILL.md"), "---\nname: roll-many\ndescription: Rolls many, rebuilt.\n---\n\nRoll.");
  assert.equal(await built.switchExtension("dice", true), true);
  assert.deepEqual(calls, ["reload", "dice:off", "reload", "dice:on"]);
  assert.match(fs.readFileSync(path.join(runDir, "extensions", "dice", "skills", "roll-many", "SKILL.md"), "utf8"), /rebuilt/);
});

test("a plugin is mounted as a link, or a copy where a link can't be made; unmounting never touches what's installed", async () => {
  const installed = makeExtension("dice");
  const at = path.join(temp(), "run", "extensions", "dice");
  assert.equal(await mountPlugin(installed, at), "link");
  await unmountPlugin(at);
  assert.ok(!fs.existsSync(at));
  assert.ok(fs.existsSync(path.join(installed, "skills", "roll-many", "SKILL.md")));
  // A copy (a run from before, or a disk without links) is emptied, keeping its path.
  fs.mkdirSync(at, { recursive: true });
  fs.writeFileSync(path.join(at, "old.txt"), "x");
  await unmountPlugin(at);
  assert.deepEqual(fs.readdirSync(at), []);
  assert.equal(await mountPlugin(installed, at), "link"); // over an empty copy too
  assert.ok(fs.existsSync(path.join(at, ".claude-plugin", "plugin.json")));
  await unmountPlugin(path.join(temp(), "never-mounted")); // nothing there: nothing to do
});
