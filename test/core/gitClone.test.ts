import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import git from "isomorphic-git";
import { cloneRepository } from "../../src/core/gitClone.js";
import { addExtension, readLock } from "../../src/core/externalExtensions.js";
import { addMarketplace } from "../../src/core/marketplaces.js";

// Installing from git without the git program (#89).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "git-clone-test-"));
const author = { name: "t", email: "t@t" };

/** A repository made without the git program: an extension, committed twice, the first tagged v1, on main. */
async function makeRepo(): Promise<{ dir: string; first: string; second: string }> {
  const dir = path.join(temp(), "coins");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  await git.init({ fs, dir, defaultBranch: "main" });
  const write = (file: string, content: string) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), content);
  };
  write(".claude-plugin/plugin.json", JSON.stringify({ name: "coins", version: "1.0.0", description: "Coins." }));
  write("skills/flip/SKILL.md", "---\nname: flip\ndescription: Flips a coin.\n---\n");
  for (const file of [".claude-plugin/plugin.json", "skills/flip/SKILL.md"]) await git.add({ fs, dir, filepath: file });
  const first = await git.commit({ fs, dir, message: "first", author });
  await git.tag({ fs, dir, ref: "v1" });
  write(".claude-plugin/plugin.json", JSON.stringify({ name: "coins", version: "2.0.0", description: "Coins." }));
  await git.add({ fs, dir, filepath: ".claude-plugin/plugin.json" });
  const second = await git.commit({ fs, dir, message: "second", author });
  return { dir, first, second };
}

/** Runs `fn` with no git program on the PATH. */
async function withoutGit<T>(fn: () => Promise<T>): Promise<T> {
  const saved = process.env.PATH;
  process.env.PATH = "";
  try {
    return await fn();
  } finally {
    process.env.PATH = saved;
  }
}

test("a local repository is read at its tip, a tag or a pinned commit, without the git program, and left untouched", async () => {
  const { dir, first, second } = await makeRepo();
  const url = pathToFileURL(dir).href;
  const version = (into: string) => JSON.parse(fs.readFileSync(path.join(into, ".claude-plugin", "plugin.json"), "utf8")).version;
  await withoutGit(async () => {
    const tip = temp();
    assert.equal(await cloneRepository(url, tip), second);
    assert.equal(version(tip), "2.0.0");
    assert.ok(fs.existsSync(path.join(tip, "skills", "flip", "SKILL.md")));
    assert.equal(fs.existsSync(path.join(tip, ".git")), false);
    const tagged = temp();
    assert.equal(await cloneRepository(url, tagged, { ref: "v1" }), first);
    assert.equal(version(tagged), "1.0.0");
    const pinned = temp();
    assert.equal(await cloneRepository(url, pinned, { sha: first.slice(0, 7) }), first);
    assert.equal(version(pinned), "1.0.0");
  });
  // The repository is as it was: same head, nothing checked out or staged.
  assert.equal(await git.resolveRef({ fs, dir, ref: "HEAD" }), second);
  assert.deepEqual((await git.statusMatrix({ fs, dir })).filter(([, head, work, stage]) => head !== work || work !== stage), []);
});

test("an extension installs from git and a marketplace is added without the git program, its commit in the lock", async () => {
  const { dir, second } = await makeRepo();
  const scope = path.join(temp(), "extensions");
  const result = await withoutGit(() => addExtension(`${pathToFileURL(dir).href}#main`, scope));
  assert.equal(result.commit, second);
  assert.equal((await readLock(scope)).coins?.commit, second);

  const market = path.join(temp(), "harbor");
  fs.mkdirSync(path.join(market, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(market, ".claude-plugin", "marketplace.json"), JSON.stringify({ name: "harbor", owner: { name: "Ada" }, plugins: [] }));
  await git.init({ fs, dir: market, defaultBranch: "main" });
  await git.add({ fs, dir: market, filepath: ".claude-plugin/marketplace.json" });
  const commit = await git.commit({ fs, dir: market, message: "market", author });
  const added = await withoutGit(() => addMarketplace(pathToFileURL(market).href, path.join(temp(), "agent")));
  assert.equal(added.name, "harbor");
  assert.equal(added.commit, commit);
});

test("what went wrong is said for a person: a missing ref, a missing commit, an SSH address without git", async () => {
  const { dir } = await makeRepo();
  const url = pathToFileURL(dir).href;
  await assert.rejects(cloneRepository(url, temp(), { ref: "nope" }), /has no branch or tag nope/);
  await assert.rejects(cloneRepository(url, temp(), { sha: "0123456789abcdef0123456789abcdef01234567" }), /has no commit 0123456789abcdef0123456789abcdef01234567/);
  await withoutGit(() => assert.rejects(cloneRepository("git@github.com:ada/harbor.git", temp()), /is an SSH address, which needs the git program, and this computer has none: use its HTTPS address instead/));
});
