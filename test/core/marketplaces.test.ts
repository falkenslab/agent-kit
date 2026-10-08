import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { hashExtension, listInstalled, loadExternalExtensions, readLock } from "../../src/core/externalExtensions.js";
import { addMarketplace, findPlugin, installFromMarketplace, listMarketplaces, readMarketplaceManifest, removeMarketplace, resolvePluginSource, updateMarketplace } from "../../src/core/marketplaces.js";
import { runExtensionCommand } from "../../src/tui/extensionCommand.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "marketplaces-test-"));
const git = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8" }).trim();

/** A plugin in `dir`: a manifest and a server, as any Claude Code plugin. */
function makePlugin(dir: string, name: string): void {
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name, version: "1.0.0", description: `The ${name}.` }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { [name]: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs"] } } }));
  fs.writeFileSync(path.join(dir, "server.mjs"), "// a server\n");
}

/** A marketplace folder: `dice` beside it, `cards` from a git repository's subfolder, and sources the kit doesn't install. */
function makeMarketplace(name = "shipyard"): { root: string; repo: string; commit: string } {
  const repo = temp();
  makePlugin(path.join(repo, "games", "cards"), "cards");
  git(repo, "init", "--quiet");
  git(repo, "add", ".");
  git(repo, "commit", "--quiet", "-m", "cards");
  const commit = git(repo, "rev-parse", "HEAD");
  const root = temp();
  makePlugin(path.join(root, "plugins", "dice"), "dice");
  fs.mkdirSync(path.join(root, ".claude-plugin"));
  fs.writeFileSync(
    path.join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({
      name,
      owner: { name: "Ada" },
      metadata: { description: "Games for agents.", pluginRoot: "./plugins" },
      plugins: [
        { name: "dice", source: "dice", description: "Rolls dice.", tags: ["games"] },
        { name: "cards", source: { source: "git-subdir", url: pathToFileURL(repo).href, path: "games/cards", sha: commit }, description: "Deals cards." },
        { name: "leaky", source: "../outside" },
        { name: "remote", source: { source: "npm", package: "@x/remote" } },
        { name: "runner", source: { source: "command", command: "make-plugin" } },
      ],
    }),
  );
  return { root, repo, commit };
}

test("a marketplace.json is read as Claude Code writes it, and checked", () => {
  const { root } = makeMarketplace();
  const manifest = readMarketplaceManifest(root);
  return manifest.then((read) => {
    assert.equal(read.name, "shipyard");
    assert.equal(read.description, "Games for agents.");
    assert.equal(read.pluginRoot, "./plugins");
    assert.deepEqual(read.plugins.map((plugin) => plugin.name), ["dice", "cards", "leaky", "remote", "runner"]);
  });
});

test("a marketplace is added as a copy, and its plugins install by name@marketplace: locked, hashed, from where they came", async () => {
  const { root, commit } = makeMarketplace();
  const extensions = temp();
  const added = await addMarketplace(root, extensions);
  assert.equal(added.name, "shipyard");
  const [known] = await listMarketplaces(extensions);
  assert.equal(known!.official, false);
  assert.ok(fs.existsSync(path.join(extensions, ".marketplaces", "shipyard", ".claude-plugin", "marketplace.json")));

  // A bare source, under pluginRoot.
  const dice = await installFromMarketplace(extensions, "dice@shipyard", extensions);
  assert.equal(dice.name, "dice");
  const lock = await readLock(extensions);
  assert.equal(lock.dice!.marketplace, "dice@shipyard");
  assert.equal(lock.dice!.sha256, await hashExtension(path.join(extensions, "dice")));
  // A git repository's subfolder, at its pinned commit; a name only one marketplace offers needs no @.
  const cards = await installFromMarketplace(extensions, "cards", extensions);
  assert.equal(cards.commit, commit);
  assert.equal((await readLock(extensions)).cards!.marketplace, "cards@shipyard");
  // They load like any installed extension; the marketplace's copy isn't one.
  const loaded = await loadExternalExtensions({ agent: extensions });
  assert.deepEqual(loaded.extensions.map((extension) => extension.name).sort(), ["cards", "dice"]);
  assert.deepEqual((await listInstalled({ agent: extensions })).map((extension) => extension.name).sort(), ["cards", "dice"]);
});

test("a source leaving the marketplace, a command source and an unknown name are refused; an npm one resolves to its package", async () => {
  const { root } = makeMarketplace();
  const extensions = temp();
  await addMarketplace(root, extensions);
  const [known] = await listMarketplaces(extensions);
  const plugin = (name: string) => known!.manifest!.plugins.find((entry) => entry.name === name)!;
  assert.throws(() => resolvePluginSource(known!, plugin("leaky")), /leaves its marketplace/);
  assert.deepEqual(resolvePluginSource(known!, plugin("remote")), { npm: { name: "@x/remote" } });
  assert.throws(() => resolvePluginSource(known!, plugin("runner")), /"command" source/);
  await assert.rejects(findPlugin(extensions, "chess"), /No marketplace offers chess/);
  await assert.rejects(findPlugin(extensions, "dice@harbor"), /No marketplace harbor/);
});

test("a name two marketplaces offer needs its marketplace; one is updated and removed, its extensions stay", async () => {
  const extensions = temp();
  await addMarketplace(makeMarketplace("shipyard").root, extensions);
  const harbor = makeMarketplace("harbor").root;
  await addMarketplace(harbor, extensions);
  await assert.rejects(findPlugin(extensions, "dice"), /in several marketplaces \(harbor, shipyard\)/);
  await installFromMarketplace(extensions, "dice@harbor", extensions);

  // Updated from its folder: a new plugin shows.
  const manifest = JSON.parse(fs.readFileSync(path.join(harbor, ".claude-plugin", "marketplace.json"), "utf8"));
  manifest.plugins.push({ name: "chess", source: "dice" });
  fs.writeFileSync(path.join(harbor, ".claude-plugin", "marketplace.json"), JSON.stringify(manifest));
  await updateMarketplace(extensions, "harbor");
  assert.equal((await findPlugin(extensions, "chess")).marketplace.name, "harbor");

  assert.equal(await removeMarketplace(extensions, "harbor"), true);
  assert.deepEqual((await listMarketplaces(extensions)).map((marketplace) => marketplace.name), ["shipyard"]);
  assert.equal((await readLock(extensions)).dice!.marketplace, "dice@harbor");
});

test("the command: the agent's own marketplace without asking; another after typing its name; installing from it asks", async () => {
  const official = makeMarketplace("shipyard").root;
  const other = makeMarketplace("harbor").root;
  const extensions = temp();
  const lines: string[] = [];
  const asked: string[] = [];
  let answer = "";
  const run = (...argv: string[]) =>
    runExtensionCommand(["extension", ...argv], {
      dirs: { agent: extensions },
      command: "captain",
      official,
      write: (line) => lines.push(line),
      ask: async (question) => {
        asked.push(question);
        return answer;
      },
    });
  const exit = process.exitCode;
  try {
    // The official one is known without adding it, and installs without a question.
    await run("search", "dice");
    assert.equal(lines.at(-1), "dice@shipyard  Rolls dice.");
    await run("add", "dice@shipyard");
    assert.match(lines.at(-1)!, /Installed dice from shipyard in the agent scope/);
    assert.equal(asked.length, 0);

    // Another: a warning, then its name typed; a wrong one adds nothing.
    answer = "harbour";
    await run("marketplace", "add", other);
    assert.match(lines.join("\n"), /isn't this agent's own: add it only if you trust who publishes it/);
    assert.match(asked.at(-1)!, /Type its name \(harbor\) to add it/);
    assert.equal(lines.at(-1), "Not added.");
    answer = "harbor";
    await run("marketplace", "add", other);
    assert.match(lines.at(-1)!, /Added the marketplace harbor/);
    await run("marketplace", "list");
    assert.match(lines.at(-2)! + lines.at(-1)!, /harbor .*shipyard \(official\)|shipyard \(official\).*harbor/s);

    // Installing from it asks; "n" installs nothing, --yes answers for the person.
    answer = "n";
    await run("add", "cards@harbor");
    assert.equal(lines.at(-1), "Not installed.");
    assert.equal((await readLock(extensions)).cards, undefined);
    await run("add", "cards@harbor", "--yes");
    assert.match(lines.at(-1)!, /Installed cards from harbor/);
    await run("search");
    assert.ok(lines.some((line) => line.startsWith("dice@shipyard (installed)")));
  } finally {
    process.exitCode = exit;
  }
});
