import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "fflate";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { addExtension, loadExternalExtensions, readLock } from "../../src/core/externalExtensions.js";
import { cachedPackageDir, npxServer, packageCacheDir } from "../../src/core/npxPackages.js";
import { trustWorkspace } from "../../src/core/workspaceTrust.js";
import { buildSessionOptions, createInputQueue } from "../../src/core/session.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "npx-packages-test-"));
const bytes = (text: string) => new TextEncoder().encode(text);

/** A ustar archive of `files`, as npm packs them. */
function tar(files: Record<string, string>): Uint8Array {
  const blocks: Uint8Array[] = [];
  for (const [name, text] of Object.entries(files)) {
    const body = bytes(text);
    const header = new Uint8Array(512);
    header.set(bytes(name), 0);
    header.set(bytes("0000644\0"), 100);
    header.set(bytes(`${body.length.toString(8).padStart(11, "0")}\0`), 124);
    header.set(bytes("0"), 156);
    header.set(bytes("ustar\x0000"), 257);
    blocks.push(header, body, new Uint8Array((512 - (body.length % 512)) % 512));
  }
  blocks.push(new Uint8Array(1024));
  const out = new Uint8Array(blocks.reduce((size, block) => size + block.length, 0));
  let offset = 0;
  for (const block of blocks) {
    out.set(block, offset);
    offset += block.length;
  }
  return out;
}

// A bare MCP server over stdio with one tool, `peek`.
const SERVER = [
  'import readline from "node:readline";',
  "const send = (message) => process.stdout.write(JSON.stringify(message) + String.fromCharCode(10));",
  'readline.createInterface({ input: process.stdin }).on("line", (line) => {',
  "  const message = JSON.parse(line);",
  '  if (message.method === "initialize") send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "dice-mcp", version: "1.2.3" }, instructions: "seed " + process.env.DICE_SEED + " args " + process.argv.slice(2).join(" ") } });',
  '  else if (message.method === "tools/list") send({ jsonrpc: "2.0", id: message.id, result: { tools: [{ name: "peek", description: "Peeks.", inputSchema: { type: "object", properties: {} } }] } });',
  "  else if (message.id !== undefined) send({ jsonrpc: '2.0', id: message.id, result: {} });",
  "});",
].join("\n");

/** An npm registry (fetch answering for registry.npmjs.org) with `@games/dice-mcp` at 1.2.3, its package.json given; counts tarball downloads. */
function registry(packageJson: Record<string, unknown> = {}, extra: Record<string, string> = {}) {
  const tarball = gzipSync(
    tar({
      "package/package.json": JSON.stringify({ name: "@games/dice-mcp", version: "1.2.3", bin: { "dice-mcp": "dist/server.mjs" }, ...packageJson }),
      "package/dist/server.mjs": SERVER,
      ...Object.fromEntries(Object.entries(extra).map(([name, text]) => [`package/${name}`, text])),
    }),
  );
  const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
  const state = { downloads: 0 };
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    const address = String(url);
    if (address === "https://registry.npmjs.org/@games%2fdice-mcp")
      return Response.json({ "dist-tags": { latest: "1.2.3" }, versions: { "1.2.3": { dist: { tarball: "https://registry.npmjs.org/dice-mcp-1.2.3.tgz", integrity } } } });
    if (address === "https://registry.npmjs.org/dice-mcp-1.2.3.tgz") {
      state.downloads++;
      return new Response(tarball);
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { state, restore: () => (globalThis.fetch = real) };
}

/** An extension whose only server is `npx <args…>`. */
function npxExtension(args: string[], env?: Record<string, string>): string {
  const dir = path.join(temp(), "dice");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "dice", description: "Dice." }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { dice: { command: "npx", args, ...(env ? { env } : {}) } } }));
  return dir;
}

test("a server run with npx: only -y, then a package at an exact version and its own arguments", () => {
  assert.equal(npxServer({ command: "node", args: ["s.mjs"] }), undefined);
  assert.deepEqual(npxServer({ command: "npx", args: ["-y", "@games/dice-mcp@1.2.3", "--fast"] }), { name: "@games/dice-mcp", version: "1.2.3", args: ["--fast"] });
  assert.deepEqual(npxServer({ command: "npx.cmd", args: ["--yes", "dice@0.1.0-beta.2"] }), { name: "dice", version: "0.1.0-beta.2", args: [] });
  assert.match(npxServer({ command: "npx", args: ["-y", "@games/dice-mcp"] }) as string, /without an exact version/);
  assert.match(npxServer({ command: "npx", args: ["-y", "dice@^1.0.0"] }) as string, /without an exact version/);
  assert.match(npxServer({ command: "npx", args: ["-y", "dice@latest"] }) as string, /without an exact version/);
  assert.match(npxServer({ command: "npx", args: ["--registry", "https://x", "dice@1.0.0"] }) as string, /option "--registry"/);
  assert.match(npxServer({ command: "npx", args: ["-y"] }) as string, /no package/);
});

test("installing fetches an npx server's package into the agent's cache, shared by both scopes, and a session runs its bin with the kit's Node", async () => {
  const fake = registry();
  try {
    const dirs = { agent: path.join(temp(), "agent"), project: path.join(temp(), "project") };
    const cache = packageCacheDir(dirs)!;
    await addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3", "--fast"], { DICE_SEED: "7" }), dirs.agent, { packages: cache });
    const locked = (await readLock(dirs.agent)).dice!.packages!["@games/dice-mcp@1.2.3"]!;
    assert.match(locked.integrity, /^sha512-/);
    assert.equal(locked.bin, "dist/server.mjs");
    assert.ok(fs.existsSync(path.join(cachedPackageDir(cache, "@games/dice-mcp", "1.2.3"), "dist", "server.mjs")));
    // The project's scope: the same package and version, from the cache.
    await addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3"]), dirs.project, { packages: cache });
    await trustWorkspace(dirs);
    assert.equal(fake.state.downloads, 1);

    const { extensions, off } = await loadExternalExtensions(dirs);
    assert.deepEqual(off, []);
    const server = (await extensions[0]!.contribute({} as never)).mcpServers!.dice as { command: string; args: string[] };
    assert.equal(server.command, process.execPath);
    assert.equal(server.args[1], path.join(cachedPackageDir(cache, "@games/dice-mcp", "1.2.3"), "dist/server.mjs"));
  } finally {
    fake.restore();
  }
});

test("an npx server without an exact version can't be installed, nor a package that doesn't bring its dependencies or runs install scripts", async () => {
  let fake = registry();
  try {
    const scope = temp();
    await assert.rejects(addExtension(npxExtension(["-y", "@games/dice-mcp"]), scope), /without an exact version/);
    await assert.rejects(addExtension(npxExtension(["-y", "@games/dice-mcp@^1.2.3"]), scope), /without an exact version/);
    fake.restore();
    fake = registry({ dependencies: { "left-pad": "^1.0.0", bundled: "^1.0.0" }, bundleDependencies: ["bundled"] });
    await assert.rejects(addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3"]), temp()), /declares dependencies it doesn't bring \(left-pad\): the kit installs none\. If they're bundled into its program, move them to devDependencies; otherwise list them in bundleDependencies/);
    fake.restore();
    fake = registry({ dependencies: { "playwright-core": "^1.0.0" }, bundleDependencies: ["playwright-core"] });
    await addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3"]), temp());
    fake.restore();
    fake = registry({ scripts: { postinstall: "node evil.js" } });
    await assert.rejects(addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3"]), temp()), /install scripts \(postinstall\)/);
    fake.restore();
    fake = registry({}, { "binding.gyp": "{}" });
    await assert.rejects(addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3"]), temp()), /native code/);
    fake.restore();
    fake = registry({ bin: { a: "dist/server.mjs", b: "dist/server.mjs" } });
    await assert.rejects(addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3"]), temp()), /none named dice-mcp/);
  } finally {
    fake.restore();
  }
});

test("a package missing from the cache, or changed in it, leaves the extension off; installing again fetches it anew", async () => {
  const fake = registry();
  try {
    const scope = temp();
    const dirs = { agent: scope };
    await addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3"]), scope);
    const dir = cachedPackageDir(packageCacheDir(dirs)!, "@games/dice-mcp", "1.2.3");
    fs.appendFileSync(path.join(dir, "dist", "server.mjs"), "\n// changed");
    assert.match((await loadExternalExtensions(dirs)).off[0]!.reason, /files in the cache changed/);
    // Installing again doesn't trust the changed copy: it fetches it again.
    await addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3"]), scope);
    assert.equal(fake.state.downloads, 2);
    assert.deepEqual((await loadExternalExtensions(dirs)).off, []);
    fs.rmSync(dir, { recursive: true });
    assert.match((await loadExternalExtensions(dirs)).off[0]!.reason, /isn't in the agent's package cache/);
  } finally {
    fake.restore();
  }
});

// The SDK's CLI, which starts the extension's server: skipped where there's none. No model is called.
const binary = path.resolve("node_modules", "@anthropic-ai", `claude-agent-sdk-${process.platform}-${process.arch}`, process.platform === "win32" ? "claude.exe" : "claude");

test("a session runs an npx server from the cache, with no npx on the PATH", { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform", timeout: 90_000 }, async () => {
  const fake = registry();
  const scope = path.join(temp(), "extensions");
  try {
    await addExtension(npxExtension(["-y", "@games/dice-mcp@1.2.3", "--fast"], { DICE_SEED: "7" }), scope);
  } finally {
    fake.restore();
  }
  const built = await buildSessionOptions({ mode: "autonomous", projectDir: temp(), extensionDirs: { agent: scope } }, temp(), {
    buildSystemPrompt: () => "P",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
  });
  // A PATH with only the CLI's folder: no npx (nor node) to run it with.
  const env = { ...process.env, PATH: path.dirname(binary) };
  const input = createInputQueue();
  const session = query({ prompt: input.iterable, options: { ...built.options, env } });
  try {
    let dice: { status: string; tools?: { name: string }[]; error?: string } | undefined;
    for (const start = Date.now(); Date.now() - start < 30_000; await new Promise((resolve) => setTimeout(resolve, 300))) {
      dice = (await session.mcpServerStatus()).find((server) => server.name === "dice");
      if (dice && dice.status !== "pending") break;
    }
    assert.equal(dice?.status, "connected", dice?.error);
    assert.deepEqual(dice?.tools?.map((tool) => tool.name), ["peek"]);
  } finally {
    input.end();
    session.close();
  }
});
