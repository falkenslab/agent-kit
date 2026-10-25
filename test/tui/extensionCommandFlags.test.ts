import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runExtensionCommand } from "../../src/tui/extensionCommand.js";

// `extension update --help` updated every extension: unknown flags were ignored (#81).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "extension-flags-test-"));

/** Runs the command, keeping what it writes and leaving the exit code as it was. */
const run = async (argv: string[]) => {
  const lines: string[] = [];
  const before = process.exitCode;
  await runExtensionCommand(["extension", ...argv], { dirs: { agent: temp() }, command: "captain", write: (line) => lines.push(...line.split("\n")) });
  const failed = process.exitCode === 1;
  process.exitCode = before;
  return { lines, failed };
};

test("--help after an action prints its usage and changes nothing", async () => {
  for (const flag of ["--help", "-h"]) {
    const { lines, failed } = await run(["update", flag]);
    assert.equal(failed, false);
    assert.deepEqual(lines, ["Usage: captain extension update [name] [--yes]"]);
  }
  const { lines } = await run(["add", "--help"]);
  assert.equal(lines[0], "Usage: captain extension add <folder | git URL[#ref] | plugin[@marketplace]> [--project | --agent] [--path <subfolder>] [--set key=value…] [--yes]");
  assert.equal(lines[1], "       captain extension add <folder> --link [--project]");
});

test("a flag an action doesn't take fails, naming it, before anything runs", async () => {
  const { lines, failed } = await run(["remove", "dice", "--projct"]);
  assert.equal(failed, true);
  assert.equal(lines[0], "captain extension remove doesn't take --projct.");
  assert.match(lines[1]!, /^Usage: captain extension remove <name>/);
  assert.equal((await run(["update", "--dry-run"])).failed, true);
});

test("the flags an action takes still work, and a value after --set or --path isn't taken for a flag", async () => {
  assert.equal((await run(["remove", "dice", "--agent"])).lines[0], "dice isn't installed in the agent scope. `captain extension list` lists them.");
  const { lines } = await run(["add", path.join(temp(), "missing"), "--set", "--weird=value", "--yes"]);
  assert.ok(!lines.join("\n").includes("doesn't take"), lines.join("\n"));
});
