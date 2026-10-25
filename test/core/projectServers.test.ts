import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { projectServerDuplicates, serverTarget } from "../../src/core/projectServers.js";
import { createSignInReminder } from "../../src/core/hooks/signInReminder.js";
import { addExtension } from "../../src/core/externalExtensions.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { createModeControl } from "../../src/core/modeControl.js";
import { createSessionView } from "../../src/core/sessionFacts.js";
import { chatExtensionsCommand } from "../../src/chat/extensions.js";
import { describeSession } from "../../src/extensions/awareness/tools.js";
import { setLanguage } from "../../src/core/messages/index.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

// A project's .mcp.json duplicating an extension's servers (#83), and how the model is told to sign in (#82).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "project-servers-test-"));

test("a server is what it reaches: a remote one's URL, an npx one's package with its version aside", () => {
  assert.equal(serverTarget({ url: "https://MCP.canva.com/mcp/" }), "https://mcp.canva.com/mcp");
  assert.equal(serverTarget({ command: "npx", args: ["-y", "@falkenslab/moodle-mcp@0.5.0"] }), "@falkenslab/moodle-mcp");
  assert.equal(serverTarget({ command: "C:\\Program Files\\nodejs\\npx.cmd", args: ["-y", "@falkenslab/moodle-mcp"] }), "@falkenslab/moodle-mcp");
  assert.equal(serverTarget({ command: "uvx", args: ["weather-mcp@2"] }), "weather-mcp");
  assert.equal(serverTarget({ command: "node", args: ["server.mjs"] }), undefined);
});

test("only the project servers an extension's duplicates are left out; the rest, and names the kit passes, stay", async () => {
  const projectDir = temp();
  fs.writeFileSync(
    path.join(projectDir, ".mcp.json"),
    JSON.stringify({
      mcpServers: {
        canva: { type: "http", url: "https://mcp.canva.com/mcp" },
        moodle: { type: "stdio", command: "npx", args: ["-y", "@falkenslab/moodle-mcp"] },
        github: { type: "http", url: "https://api.githubcopilot.com/mcp/" },
        passed: { type: "http", url: "https://mcp.canva.com/mcp" },
      },
    }),
  );
  const extensions = [
    { name: "canva", servers: { canva: { type: "http" as const, url: "https://mcp.canva.com/mcp" } } },
    { name: "moodle-teacher", servers: { moodle: { command: "npx", args: ["-y", "@falkenslab/moodle-mcp@0.5.0"] } } },
  ];
  const found = await projectServerDuplicates(projectDir, extensions, new Set(["passed"]));
  assert.deepEqual(found?.duplicates, [
    { server: "canva", target: "https://mcp.canva.com/mcp", extension: "canva" },
    { server: "moodle", target: "@falkenslab/moodle-mcp", extension: "moodle-teacher" },
  ]);
  assert.equal(await projectServerDuplicates(temp(), extensions, new Set()), undefined);
});

test("a session leaves the duplicate out by name and says so in /extensions and about_me", async () => {
  setLanguage("en");
  const dir = path.join(temp(), "canva");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "canva", description: "Canva." }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { canva: { type: "http", url: "https://mcp.canva.com/mcp" } } }));
  const projectDir = path.join(temp(), "programacion-1");
  fs.mkdirSync(projectDir);
  fs.writeFileSync(path.join(projectDir, ".mcp.json"), JSON.stringify({ mcpServers: { canva: { type: "http", url: "https://mcp.canva.com/mcp" }, github: { type: "http", url: "https://example.com/mcp" } } }));
  const dirs = { agent: path.join(temp(), "extensions") };
  await addExtension(dir, dirs.agent);
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, replyInLanguage: false };
  const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec);
  assert.deepEqual((built.options.settings as { deniedMcpServers?: { serverName: string }[] }).deniedMcpServers, [{ serverName: "canva" }]);
  const lines = (await chatExtensionsCommand("/extensions", built.extensions, true))?.lines ?? [];
  assert.ok(lines.includes("programacion-1/.mcp.json also declares canva (https://mcp.canva.com/mcp): the extensions' are used"), lines.join("\n"));
  // The session with a remote extension carries the sign-in rule in its prompt (#82).
  assert.match(String(built.options.systemPrompt), /ask them to run `\/extensions sign-in <extension>`/);
  assert.equal(built.options.hooks?.UserPromptSubmit?.length, 2);
});

test("with the person's message, the model is told once which extensions wait for a sign-in, and again after a sign-out (#82)", async () => {
  let status = "needs-auth";
  const reminder = createSignInReminder({ extensions: () => [{ name: "canva", remoteServers: ["canva-canva"] }], status: () => async () => [{ name: "canva-canva", status } as never] });
  const context = async () =>
    ((await reminder({ hook_event_name: "UserPromptSubmit", prompt: "hi", session_id: "s", transcript_path: "", cwd: "" } as never, undefined, { signal: new AbortController().signal })) as { hookSpecificOutput?: { additionalContext?: string } }).hookSpecificOutput?.additionalContext;
  assert.match((await context()) ?? "", /The canva extension needs the person to sign in.*`\/extensions sign-in canva`.*Never suggest `\/mcp`/);
  assert.equal(await context(), undefined);
  status = "connected";
  assert.equal(await context(), undefined);
  status = "needs-auth";
  assert.match((await context()) ?? "", /`\/extensions sign-in canva`/);
});

test("about_me says which extensions wait for a sign-in, and which project servers were left out", async () => {
  const view = createSessionView(
    {
      kitVersion: "0.29.0",
      language: "en",
      extensions: {
        active: [{ name: "canva", description: "Canva.", provides: [], capabilities: [], unavailable: [], servers: ["canva-canva"], help: [] }],
        inactive: [],
        projectServers: { file: "/p/.mcp.json", duplicates: [{ server: "canva", target: "https://mcp.canva.com/mcp", extension: "canva" }] },
      },
      subagents: [],
      skills: [],
      runDir: "/run",
    },
    createModeControl("guided"),
  );
  view.attach({ mcpServerStatus: async () => [{ name: "canva-canva", status: "needs-auth" } as never] });
  const facts = await view.facts();
  assert.deepEqual(facts.extensions.needSignIn, ["canva"]);
  const text = describeSession(facts);
  assert.match(text, /## Waiting for a sign-in\n\n- \*\*canva\*\*: .*`\/extensions sign-in canva`/);
  assert.match(text, /- \*\*canva\*\* \(https:\/\/mcp\.canva\.com\/mcp\): left out, the canva extension's server is used instead\./);
});

test("/extensions doesn't list a capability's tools as missing while its extension waits for a sign-in", async () => {
  setLanguage("en");
  const { describeCapabilities } = await import("../../src/chat/extensions.js");
  const status = {
    dirs: {},
    untrusted: [],
    installed: [],
    active: ["canva"],
    about: { canva: { description: "Canva.", provides: [], servers: ["canva-canva"], capabilities: [{ id: "find", label: "Finding designs", description: "", skills: [], tools: ["mcp__canva-canva__search-designs"] }], unavailable: [] } },
    inactive: [],
    sessionTools: () => ["Read"],
  } as never;
  assert.match(describeCapabilities(status).join("\n"), /search-designs/);
  assert.doesNotMatch(describeCapabilities(status, ["canva"]).join("\n"), /search-designs/);
});
