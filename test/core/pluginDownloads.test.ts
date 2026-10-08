import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync, zipSync } from "fflate";
import { readLock } from "../../src/core/externalExtensions.js";
import { addMarketplace, installFromMarketplace } from "../../src/core/marketplaces.js";
import { fetchArchivePlugin, pickVersion, untar } from "../../src/core/pluginDownloads.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "plugin-downloads-test-"));
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

const plugin = (name: string) => ({
  ".claude-plugin/plugin.json": JSON.stringify({ name, version: "2.0.1", description: `The ${name}.` }),
  ".mcp.json": JSON.stringify({ mcpServers: { [name]: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs"] } } }),
  "server.mjs": "// a server\n",
});

/** fetch() answering from `routes`, while `run` runs. */
async function withFetch(routes: Record<string, Uint8Array | object>, run: () => Promise<void>): Promise<void> {
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    const body = routes[String(url)];
    if (!body) return new Response("not found", { status: 404 });
    return body instanceof Uint8Array ? new Response(body) : Response.json(body);
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = real;
  }
}

test("a version is picked as npm would: exact, ^, ~, comparators, the highest that fits", () => {
  const versions = ["1.0.0", "1.2.0", "1.2.5", "1.3.0", "2.0.0", "2.1.0-beta.1"];
  assert.equal(pickVersion(versions, "1.2.0"), "1.2.0");
  assert.equal(pickVersion(versions, "^1.2.0"), "1.3.0");
  assert.equal(pickVersion(versions, "~1.2.0"), "1.2.5");
  assert.equal(pickVersion(versions, ">=1.0.0 <2.0.0"), "1.3.0");
  assert.equal(pickVersion(versions, "*"), "2.0.0");
  assert.equal(pickVersion(versions, "^3.0.0"), undefined);
});

test("a tar's regular files are read by path", () => {
  const files = untar(tar({ "package/a.txt": "A", "package/dir/b.txt": "B".repeat(700) }));
  assert.deepEqual([...files.keys()], ["package/a.txt", "package/dir/b.txt"]);
  assert.equal(new TextDecoder().decode(files.get("package/dir/b.txt")), "B".repeat(700));
});

test("a marketplace's npm and archive plugins install from their downloads, checked, and locked with where they came from", async () => {
  const tarball = gzipSync(tar(Object.fromEntries(Object.entries(plugin("dice")).map(([name, text]) => [`package/${name}`, text]))));
  const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
  const zip = zipSync(Object.fromEntries(Object.entries(plugin("cards")).map(([name, text]) => [`cards-2.0.1/${name}`, bytes(text)])));
  const sha256 = createHash("sha256").update(zip).digest("hex");
  const root = temp();
  fs.mkdirSync(path.join(root, ".claude-plugin"));
  fs.writeFileSync(
    path.join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({
      name: "harbor",
      owner: { name: "Ada" },
      plugins: [
        { name: "dice", source: { source: "npm", package: "@games/dice", version: "^2.0.0", registry: "https://registry.test" } },
        { name: "cards", source: { source: "archive", url: "https://files.test/cards.zip", sha256 } },
        { name: "forged", source: { source: "archive", url: "https://files.test/cards.zip", sha256: "0".repeat(64) } },
      ],
    }),
  );
  const extensions = temp();
  await addMarketplace(root, extensions);
  await withFetch(
    {
      "https://registry.test/@games%2fdice": { "dist-tags": { latest: "2.0.1" }, versions: { "1.0.0": {}, "2.0.1": { dist: { tarball: "https://registry.test/dice-2.0.1.tgz", integrity } } } },
      "https://registry.test/dice-2.0.1.tgz": tarball,
      "https://files.test/cards.zip": zip,
    },
    async () => {
      const dice = await installFromMarketplace(extensions, "dice", extensions);
      assert.equal(dice.name, "dice");
      const cards = await installFromMarketplace(extensions, "cards", extensions);
      assert.equal(cards.name, "cards");
      await assert.rejects(installFromMarketplace(extensions, "forged", extensions), /doesn't match its sha256/);
    },
  );
  const lock = await readLock(extensions);
  assert.equal(lock.dice!.source, "npm:@games/dice@2.0.1");
  assert.equal(lock.dice!.marketplace, "dice@harbor");
  assert.equal(lock.cards!.source, "https://files.test/cards.zip");
  assert.ok(fs.existsSync(path.join(extensions, "dice", "server.mjs")));
  assert.ok(fs.existsSync(path.join(extensions, "cards", ".mcp.json")));
});

test("a download that isn't https, or a zip with a file outside its folder, is refused", async () => {
  await assert.rejects(fetchArchivePlugin("http://files.test/x.zip"), /Only https downloads/);
  const evil = zipSync({ "../escape.txt": bytes("x") });
  await withFetch({ "https://files.test/evil.zip": evil }, async () => {
    await assert.rejects(fetchArchivePlugin("https://files.test/evil.zip"), /outside its folder/);
  });
});
