import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { addExtension, codeStoreDir, extensionDataDir, installTarget, listInstalled, loadExternalExtensions, readLock, scopePrivateDir, setExtensionEnabled, setExtensionOptions } from "../../src/core/externalExtensions.js";
import { extensionSecretsPath } from "../../src/core/extensionOptions.js";
import { installExtension, restoreExtensions } from "../../src/core/extensionCatalog.js";
import { trustWorkspace } from "../../src/core/workspaceTrust.js";
import { runExtensionCommand } from "../../src/tui/extensionCommand.js";
import { createChatController, type ChatSettings } from "../../src/chat/chatController.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { setLanguage } from "../../src/core/messages/index.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";
import type { AgentEvent, AgentRun } from "../../src/core/runner.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "workspace-extensions-test-"));

/** An extension with an option and a secret, at `version`. */
function makeExtension(dir: string, version = "1.0.0"): string {
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "dice", version, description: "Rolls dice.", userConfig: { sides: { type: "number", title: "Sides", description: "How many." }, token: { type: "string", title: "Token", description: "Its token.", sensitive: true } } }),
  );
  return dir;
}

/** A folder marketplace offering the dice at `version`. */
function makeMarketplace(version = "1.0.0"): string {
  const root = path.join(temp(), "shipyard");
  fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(root, ".claude-plugin", "marketplace.json"), JSON.stringify({ name: "shipyard", owner: { name: "Ada" }, plugins: [{ name: "dice", source: "./dice" }] }));
  makeExtension(path.join(root, "dice"), version);
  return root;
}

test("a workspace keeps only its lock: the code in the agent's store, its data and secrets in the agent's folder", async () => {
  const workspace = temp();
  const dirs = { agent: path.join(temp(), "agent"), project: path.join(workspace, "extensions") };
  await addExtension(makeExtension(path.join(temp(), "dice")), dirs.project, installTarget(dirs, "project"));
  await trustWorkspace(dirs);
  const [dice] = await listInstalled(dirs);
  await setExtensionOptions(dice!, "dice", { sides: "20", token: "s3cret" });
  fs.mkdirSync(dice!.dataDir, { recursive: true });
  fs.writeFileSync(path.join(dice!.dataDir, "rolls.txt"), "6");

  // In the workspace: the lock, with the options a person shares, never a secret.
  assert.deepEqual(fs.readdirSync(dirs.project), ["extensions.lock.json"]);
  const lock = (await readLock(dirs.project)).dice!;
  assert.deepEqual([lock.stored, lock.options], [true, { sides: 20 }]);
  assert.equal(JSON.stringify(lock).includes("s3cret"), false);
  // The rest, in the agent's folder: the code by content, the data and secrets in the workspace's private folder.
  const privateDir = scopePrivateDir(dirs, "project")!;
  assert.ok(privateDir.startsWith(path.join(dirs.agent, ".projects")));
  assert.equal(dice!.dataDir, extensionDataDir(privateDir, "dice"));
  assert.ok(fs.existsSync(extensionSecretsPath(privateDir, "dice")));
  assert.ok(dice!.dir.startsWith(codeStoreDir(dirs)!));
  assert.deepEqual((await loadExternalExtensions(dirs)).off, []);
});

test("a workspace taken to another computer: its extensions off until restored, then until trusted; another version asks again", async () => {
  const official = makeMarketplace("1.0.0");
  const workspace = temp();
  const mine = { agent: path.join(temp(), "agent"), project: path.join(workspace, "extensions") };
  await installExtension(mine, "dice@shipyard", { scope: "project", official });
  // Installed into the workspace by the person: trusted there already.
  assert.deepEqual((await loadExternalExtensions(mine)).off, []);

  // Someone else's agent, the same workspace (its lock only).
  const theirs = { agent: path.join(temp(), "agent"), project: mine.project };
  assert.match((await loadExternalExtensions(theirs)).off[0]!.reason, /isn't trusted here yet/);
  await trustWorkspace(theirs);
  assert.match((await loadExternalExtensions(theirs)).off[0]!.reason, /isn't on this computer yet .*`extension restore`/);
  assert.deepEqual(await restoreExtensions(theirs, { official }), { restored: ["dice"], failed: [] });
  assert.deepEqual((await loadExternalExtensions(theirs)).off, []);
  // Restored again: nothing to do.
  assert.deepEqual(await restoreExtensions(theirs, { official }), { restored: [], failed: [] });

  // Turning it off and on is the person's: no new question.
  await setExtensionEnabled(theirs.project, "dice", false);
  await setExtensionEnabled(theirs.project, "dice", true);
  assert.deepEqual((await loadExternalExtensions(theirs)).untrusted, []);

  // The owner updates it in the workspace: the other agent must trust the new version, and restore it.
  fs.writeFileSync(path.join(official, "dice", "README.md"), "v1.1");
  makeExtension(path.join(official, "dice"), "1.1.0");
  await installExtension(mine, "dice@shipyard", { scope: "project", official });
  assert.deepEqual((await loadExternalExtensions(theirs)).untrusted.map((extension) => extension.name), ["dice"]);

  // A lock whose version its marketplace no longer has: said, not installed.
  const lock = JSON.parse(fs.readFileSync(path.join(theirs.project, "extensions.lock.json"), "utf8"));
  lock.dice.sha256 = "0".repeat(64);
  const third = { agent: path.join(temp(), "agent"), project: path.join(temp(), "extensions") };
  fs.mkdirSync(third.project, { recursive: true });
  fs.writeFileSync(path.join(third.project, "extensions.lock.json"), JSON.stringify(lock));
  const failed = await restoreExtensions(third, { official });
  assert.match(failed.failed[0]!.reason, /has another version now: `extension update dice` takes it/);
});

test("extension restore and extension trust, from the command", async () => {
  const official = makeMarketplace();
  const project = path.join(temp(), "extensions");
  await installExtension({ agent: path.join(temp(), "agent"), project }, "dice@shipyard", { scope: "project", official });
  const dirs = { agent: path.join(temp(), "agent"), project };
  const lines: string[] = [];
  const run = (...argv: string[]) => runExtensionCommand(["extension", ...argv], { dirs, official, command: "agent", write: (line) => lines.push(line), ask: async () => "" });
  await run("restore");
  assert.deepEqual(lines, ["Restored dice.", "They run once you trust them: `agent extension trust`, or the chat asks."]);
  lines.length = 0;
  await run("trust");
  assert.deepEqual(lines, ["Trusted dice in this workspace, as it is now: another version asks again."]);
  assert.deepEqual((await loadExternalExtensions(dirs)).off, []);
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

test("a chat opened in a workspace with untrusted extensions asks, and trusted they run in the same conversation", async () => {
  setLanguage("en");
  const official = makeMarketplace();
  const projectDir = temp();
  const project = path.join(projectDir, "extensions");
  await installExtension({ agent: path.join(temp(), "agent"), project }, "dice@shipyard", { scope: "project", official });
  const dirs = { agent: path.join(temp(), "agent"), project };
  await restoreExtensions(dirs, { official });
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
  const controller = await createChatController((run) => buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, run.dir, spec, { run }), { runsDir: temp(), panels: "state", promptSuggestions: false, runQuery: quietAgent });
  try {
    assert.deepEqual(controller.getState().extensions?.untrusted.map((extension) => extension.name), ["dice"]);
    await controller.start();
    const waitFor = async (condition: () => boolean) => {
      for (const start = Date.now(); !condition(); await new Promise((resolve) => setTimeout(resolve, 20))) if (Date.now() - start > 5000) assert.fail("timed out");
    };
    await waitFor(() => controller.getState().panel !== null);
    const panel = controller.getState().panel!;
    assert.equal(panel.kind, "decision");
    assert.equal(panel.prompt.title, "This workspace brings extensions");
    assert.ok(panel.prompt.lines.some((line) => line.startsWith("- dice 1.0.0")));
    controller.answer(panel.id, "y");
    await waitFor(() => controller.getState().extensions?.active.includes("dice") ?? false);
    assert.deepEqual(controller.getState().extensions?.untrusted, []);
  } finally {
    controller.close();
  }
});
