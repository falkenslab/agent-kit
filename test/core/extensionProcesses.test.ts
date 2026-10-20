import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { addExtension, setExtensionOptions } from "../../src/core/externalExtensions.js";
import { mountPlugin, unmountPlugin } from "../../src/core/liveExtensions.js";
import { buildSessionOptions, createInputQueue } from "../../src/core/session.js";
import { runQuery } from "../../src/core/runner.js";
import { sessionViewOf } from "../../src/core/sessionFacts.js";

// The SDK's CLI, which starts and stops an installed extension's server: a native binary per
// platform. Skipped where there's none. No model is called: the session only starts its servers.
const binary = path.resolve("node_modules", "@anthropic-ai", `claude-agent-sdk-${process.platform}-${process.arch}`, process.platform === "win32" ? "claude.exe" : "claude");

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "extension-processes-test-"));

/**
 * The options with a Claude Code config folder of the test's own: the CLI saves a server switched
 * off in it (#75), never in the runner's `~/.claude.json`. A spread keeps the session's view.
 */
const isolated = <T extends { env?: Record<string, string | undefined> }>(options: T, configDir = temp()): T => ({ ...options, env: { ...process.env, ...options.env, CLAUDE_CONFIG_DIR: configDir } });

/** An installed extension whose server starts a child that starts a grandchild, as a browser does, each writing its pid. */
function makeSpawner(pids: string): string {
  const dir = path.join(temp(), "spawner");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "spawner", description: "Starts processes." }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { spawner: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs"] } } }));
  const keepAlive = "setInterval(() => {}, 1000);";
  fs.writeFileSync(
    path.join(dir, "child.mjs"),
    `import { spawn } from "node:child_process";
import fs from "node:fs";
const grandchild = spawn(process.execPath, ["-e", ${JSON.stringify(keepAlive)}], { stdio: "ignore" });
fs.appendFileSync(${JSON.stringify(pids)}, grandchild.pid + "\\n");
${keepAlive}
`,
  );
  // A bare MCP server over stdio: it answers initialize and lists no tools.
  fs.writeFileSync(
    path.join(dir, "server.mjs"),
    `import { spawn } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
const child = spawn(process.execPath, [fileURLToPath(new URL("./child.mjs", import.meta.url))], { stdio: "ignore" });
fs.appendFileSync(${JSON.stringify(pids)}, child.pid + "\\n");
const send = (message) => process.stdout.write(JSON.stringify(message) + "\\n");
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "spawner", version: "1" } } });
  else if (message.method === "tools/list") send({ jsonrpc: "2.0", id: message.id, result: { tools: [] } });
  else if (message.id !== undefined) send({ jsonrpc: "2.0", id: message.id, result: {} });
});
`,
  );
  return dir;
}

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Waits until `condition` holds, or fails after `ms`. */
async function until(condition: () => boolean, what: string, ms = 20_000): Promise<void> {
  for (const start = Date.now(); !condition(); ) {
    if (Date.now() - start > ms) assert.fail(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

test("turning an installed extension off, or closing the session, ends its server's whole process tree", { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform", timeout: 90_000 }, async () => {
  const root = temp();
  const pids = path.join(root, "pids.txt");
  const scope = path.join(root, "extensions");
  await addExtension(makeSpawner(pids), scope);
  const built = await buildSessionOptions({ mode: "autonomous", projectDir: temp(), extensionDirs: { agent: scope } }, temp(), {
    buildSystemPrompt: () => "P",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
  });
  const started = (): number[] => (fs.existsSync(pids) ? fs.readFileSync(pids, "utf8").trim().split("\n").filter(Boolean).map(Number) : []);
  // A conversation that never sends a message: the session only starts its servers.
  const input = createInputQueue();
  const session = query({ prompt: input.iterable, options: isolated(built.options) });
  try {
    await until(() => started().length === 2, "the server's child and grandchild");
    // Connected, not only started: under load a server still connecting outlives turning it off.
    for (const start = Date.now(); (await session.mcpServerStatus()).find((server) => server.name === "spawner")?.status !== "connected"; await new Promise((resolve) => setTimeout(resolve, 200))) {
      if (Date.now() - start > 30_000) assert.fail("timed out waiting for the server to connect");
    }
    const first = started();
    await session.toggleMcpServer("spawner", false);
    await until(() => first.every((pid) => !alive(pid)), "the first tree to end when the extension is turned off");

    await session.toggleMcpServer("spawner", true);
    await until(() => started().length === 4, "a new tree when it's turned on");
    const second = started().slice(2);
    input.end();
    session.close();
    await until(() => second.every((pid) => !alive(pid)), "the second tree to end when the session closes");
  } finally {
    input.end();
    session.close();
    for (const pid of started()) if (alive(pid)) process.kill(pid);
  }
});

test("the CLI loads an installed extension's plugin through its mount, and reloadPlugins() unloads it when the link goes and loads it when it's back", { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform", timeout: 90_000 }, async () => {
  const plugin = path.join(temp(), "dice");
  fs.mkdirSync(path.join(plugin, ".claude-plugin"), { recursive: true });
  fs.mkdirSync(path.join(plugin, "skills", "roll-many"), { recursive: true });
  fs.writeFileSync(path.join(plugin, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "dice", description: "Rolls dice." }));
  fs.writeFileSync(path.join(plugin, "skills", "roll-many", "SKILL.md"), "---\nname: roll-many\ndescription: Rolls many dice.\n---\n\nRoll.");
  const scope = path.join(temp(), "extensions");
  await addExtension(plugin, scope);
  const runDir = temp();
  const built = await buildSessionOptions({ mode: "guided", projectDir: temp(), extensionDirs: { agent: scope } }, runDir, {
    buildSystemPrompt: () => "P",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
  });
  const mount = path.join(runDir, "extensions", "dice");
  const input = createInputQueue();
  const session = query({ prompt: input.iterable, options: isolated(built.options) });
  const loaded = async () => (await session.reloadPlugins()).commands.some((command) => command.name === "dice:roll-many");
  try {
    assert.equal(await loaded(), true);
    await unmountPlugin(mount);
    assert.equal(await loaded(), false);
    await mountPlugin(path.join(scope, "dice"), mount);
    assert.equal(await loaded(), true);
    assert.ok(fs.existsSync(path.join(scope, "dice", "skills", "roll-many", "SKILL.md")));
  } finally {
    input.end();
    session.close();
  }
});

/** An installed extension whose server has two tools, `peek` marked `readOnlyHint` and `roll` not, and the manifest's `agent-kit` key given. */
function makeHinted(name: string, kit?: Record<string, unknown>): string {
  const dir = path.join(temp(), name);
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name, description: "Dice.", ...(kit ? { metadata: { "agent-kit": kit } } : {}) }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { [name]: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs"] } } }));
  const tools = [
    { name: "peek", description: "Looks at the die.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
    { name: "roll", description: "Rolls the die.", inputSchema: { type: "object", properties: {} } },
  ];
  fs.writeFileSync(
    path.join(dir, "server.mjs"),
    `import readline from "node:readline";
const send = (message) => process.stdout.write(JSON.stringify(message) + "\\n");
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: ${JSON.stringify(name)}, version: "1" } } });
  else if (message.method === "tools/list") send({ jsonrpc: "2.0", id: message.id, result: { tools: ${JSON.stringify(tools)} } });
  else if (message.id !== undefined) send({ jsonrpc: "2.0", id: message.id, result: {} });
});
`,
  );
  return dir;
}

test("plan mode lets through what an installed server marks readOnlyHint when its manifest lists nothing, and only the manifest's list when it does", { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform", timeout: 90_000 }, async () => {
  const scope = path.join(temp(), "extensions");
  await addExtension(makeHinted("hinted"), scope);
  await addExtension(makeHinted("listed", { readOnlyTools: ["roll"] }), scope);
  const built = await buildSessionOptions({ mode: "guided", projectDir: temp(), extensionDirs: { agent: scope } }, temp(), {
    buildSystemPrompt: () => "P",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
  });
  assert.ok(built.modeControl.set("plan"));
  const hooks = built.options.hooks!.PreToolUse!.flatMap((matcher) => matcher.hooks);
  // Whether plan mode lets a call through: no hook denies it.
  const allowed = async (tool_name: string): Promise<boolean> => {
    for (const hook of hooks) {
      const output = (await hook({ hook_event_name: "PreToolUse", tool_name, tool_input: {}, tool_use_id: "t", session_id: "s", transcript_path: "", cwd: "" } as never, "t", { signal: new AbortController().signal })) as { hookSpecificOutput?: { permissionDecision?: string } };
      if (output.hookSpecificOutput?.permissionDecision === "deny") return false;
    }
    return true;
  };
  // A conversation that never sends a message: the session only starts its servers. runQuery()
  // attaches the session the plan gate asks.
  const input = createInputQueue();
  const run = runQuery(input.iterable, isolated(built.options));
  try {
    // Denied while the server is still connecting; let through once it's there.
    for (const start = Date.now(); !(await allowed("mcp__hinted__peek")); ) {
      if (Date.now() - start > 30_000) assert.fail("timed out waiting for the hinted tool to be let through");
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    assert.equal(await allowed("mcp__hinted__roll"), false);
    // The manifest's list is the whole answer: the server's hint doesn't count.
    assert.equal(await allowed("mcp__listed__roll"), true);
    assert.equal(await allowed("mcp__listed__peek"), false);
  } finally {
    input.end();
    run.close();
  }
});

test("changing an installed extension's option in a session restarts its server, which takes the new value", { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform", timeout: 90_000 }, async () => {
  const root = temp();
  const log = path.join(root, "starts.jsonl");
  const dir = path.join(root, "probe");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "probe", description: "Probe.", userConfig: { site: { type: "string", title: "Site", description: "Its site.", required: true } } }),
  );
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { probe: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs"], env: { SITE: "${user_config.site}", PROBE_LOG: log } } } }));
  // On each start, its pid and the site it was given.
  fs.writeFileSync(
    path.join(dir, "server.mjs"),
    [
      'import fs from "node:fs";',
      'import readline from "node:readline";',
      "fs.appendFileSync(process.env.PROBE_LOG, JSON.stringify({ pid: process.pid, site: process.env.SITE }) + String.fromCharCode(10));",
      "const send = (message) => process.stdout.write(JSON.stringify(message) + String.fromCharCode(10));",
      'readline.createInterface({ input: process.stdin }).on("line", (line) => {',
      "  const message = JSON.parse(line);",
      '  if (message.method === "initialize") send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "probe", version: "1" } } });',
      '  else if (message.method === "tools/list") send({ jsonrpc: "2.0", id: message.id, result: { tools: [] } });',
      "  else if (message.id !== undefined) send({ jsonrpc: '2.0', id: message.id, result: {} });",
      "});",
    ].join("\n"),
  );
  const scope = path.join(root, "extensions");
  await addExtension(dir, scope);
  await setExtensionOptions(scope, "probe", { site: "https://a.example" });
  const built = await buildSessionOptions({ mode: "guided", projectDir: temp(), extensionDirs: { agent: scope } }, temp(), {
    buildSystemPrompt: () => "P",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
  });
  const starts = (): { pid: number; site: string }[] => (fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : []);
  const input = createInputQueue();
  const run = runQuery(input.iterable, isolated(built.options));
  try {
    await until(() => starts().length === 1, "the server's start");
    // The CLI passes the placeholder through untouched: the launcher puts the value in.
    assert.equal(starts()[0]!.site, "https://a.example");
    await setExtensionOptions(scope, "probe", { site: "https://b.example" });
    assert.equal(await built.restartExtension("probe"), true);
    await until(() => starts().length === 2, "the server's restart");
    const [first, second] = starts();
    assert.equal(second!.site, "https://b.example");
    assert.notEqual(second!.pid, first!.pid);
    await until(() => !alive(first!.pid), "the first server to end");
    assert.equal(await built.restartExtension("missing"), false);
  } finally {
    input.end();
    run.close();
  }
});

test("a server the CLI saved as switched off in an earlier session is turned back on when the kit passes it again (#75)", { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform", timeout: 90_000 }, async () => {
  const scope = path.join(temp(), "extensions");
  await addExtension(makeHinted("dice"), scope);
  const projectDir = temp();
  const configDir = temp();
  const build = () =>
    buildSessionOptions({ mode: "guided", projectDir, extensionDirs: { agent: scope } }, temp(), { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined });
  const status = async (session: { mcpServerStatus(): Promise<{ name: string; status: string }[]> }) => (await session.mcpServerStatus()).find((server) => server.name === "dice")?.status;
  const until = async (condition: () => Promise<boolean>, what: string) => {
    for (const start = Date.now(); !(await condition()); await new Promise((resolve) => setTimeout(resolve, 300))) if (Date.now() - start > 30_000) assert.fail(`timed out waiting for ${what}`);
  };

  // An earlier session switches it off, as /extensions disable does: the CLI saves that for the folder.
  const first = createInputQueue();
  const earlier = query({ prompt: first.iterable, options: isolated((await build()).options, configDir) });
  try {
    await until(async () => (await status(earlier)) === "connected", "the server to connect");
    await earlier.toggleMcpServer("dice", false);
    assert.equal(await status(earlier), "disabled");
  } finally {
    first.end();
    earlier.close();
  }
  const saved = JSON.parse(fs.readFileSync(path.join(configDir, ".claude.json"), "utf8")).projects?.[path.resolve(projectDir).replace(/\\/g, "/")]?.disabledMcpServers;
  assert.deepEqual(saved, ["dice"]);

  // The next session the kit opens passes it again: it's on, and the saved entry is gone.
  const second = createInputQueue();
  const options = isolated((await build()).options, configDir);
  const run = runQuery(second.iterable, options);
  const view = sessionViewOf(options)!;
  const savedNow = (): string[] => JSON.parse(fs.readFileSync(path.join(configDir, ".claude.json"), "utf8")).projects?.[path.resolve(projectDir).replace(/\\/g, "/")]?.disabledMcpServers ?? [];
  try {
    await until(async () => (await view.controls().mcpServerStatus?.())?.find((server) => server.name === "dice")?.status === "connected", "the server to be turned back on");
    // Turning it on removes the saved entry, as the CLI does itself.
    await until(async () => !savedNow().includes("dice"), "the saved switch to be removed");
  } finally {
    second.end();
    run.close();
  }
});
