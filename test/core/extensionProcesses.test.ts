import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { addExtension } from "../../src/core/externalExtensions.js";
import { buildSessionOptions, createInputQueue } from "../../src/core/session.js";

// The SDK's CLI, which starts and stops an installed extension's server: a native binary per
// platform. Skipped where there's none. No model is called: the session only starts its servers.
const binary = path.resolve("node_modules", "@anthropic-ai", `claude-agent-sdk-${process.platform}-${process.arch}`, process.platform === "win32" ? "claude.exe" : "claude");

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "extension-processes-test-"));

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
  const session = query({ prompt: input.iterable, options: built.options });
  try {
    await until(() => started().length === 2, "the server's child and grandchild");
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
