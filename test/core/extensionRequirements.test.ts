import { test } from "node:test";
import assert from "node:assert/strict";
import { atLeast, checkRequirement, describeMissing, findOnPath, installHint, parseRequirements, requirementsProblem, type ExtensionRequirement } from "../../src/core/extensionRequirements.js";

// The programs an extension needs (#63), checked with Node itself: it's on every computer the tests run on.
const node = (min: string, args = ["--version"]): ExtensionRequirement => ({
  name: "Node.js",
  program: "node",
  version: { args, min },
  install: { windows: "winget install OpenJS.NodeJS.LTS", macos: "brew install node", url: "https://nodejs.org" },
  for: [],
});

test("a requirement is read as given, its name defaulting to its program; one without a program is dropped", () => {
  assert.deepEqual(parseRequirements([{ program: "ffmpeg", install: { linux: "sudo apt install ffmpeg", other: "x" }, for: ["transcribing", 3] }, { name: "Nothing" }, "docker"]), [
    { name: "ffmpeg", program: "ffmpeg", install: { linux: "sudo apt install ffmpeg" }, for: ["transcribing"] },
  ]);
  assert.deepEqual(parseRequirements(undefined), []);
});

test("a requirement can only name a program on the PATH and ask for its version with options, for a capability it provides", () => {
  assert.equal(requirementsProblem([node("18.0.0")], []), undefined);
  assert.equal(requirementsProblem([{ ...node("18.0.0"), program: "C:/tools/node" }], []), `needs the program "C:/tools/node", which isn't a bare name found on the PATH`);
  assert.equal(requirementsProblem([node("18.0.0", ["run", "--rm", "alpine"])], []), `checks node's version with "run": only options (--version, -v) or version`);
  assert.equal(requirementsProblem([node("latest")], []), "wants node latest, which isn't a version like 24.0.0");
  assert.equal(requirementsProblem([{ ...node("18.0.0"), for: ["lab"] }], ["video"]), "needs node for lab, a capability it doesn't provide");
  assert.equal(requirementsProblem([{ ...node("18.0.0"), version: { args: ["version"], min: "18" } }], []), undefined);
});

test("checking finds the program, runs it with its version arguments only, and compares the version", async () => {
  assert.ok(await findOnPath("node"));
  assert.equal(await findOnPath("no-such-program-for-agent-kit"), undefined);
  const ok = await checkRequirement(node("18.0.0"));
  assert.deepEqual([ok.found, ok.ok, ok.version], [true, true, process.versions.node]);
  const old = await checkRequirement(node("999.0.0"));
  assert.deepEqual([old.found, old.ok, old.version], [true, false, process.versions.node]);
  const absent = await checkRequirement({ ...node("1.0.0"), program: "no-such-program-for-agent-kit" });
  assert.deepEqual([absent.found, absent.ok], [false, false]);
  // Without a version to check, being there is enough.
  assert.equal((await checkRequirement({ ...node("1.0.0"), version: undefined } as ExtensionRequirement)).ok, true);
});

test("a program that doesn't answer is stopped after the timeout, and counts as there", async () => {
  const started = Date.now();
  // node -i waits for input that never comes.
  const hung = await checkRequirement(node("1.0.0", ["-i"]), { timeoutMs: 300 });
  assert.ok(Date.now() - started < 5000, "it waited for the program");
  assert.equal(hung.found, true);
});

test("versions compare as x.y.z, and what's missing says how to install it on this system", () => {
  assert.equal(atLeast("24.0.7", "24.0.0"), true);
  assert.equal(atLeast("24.1", "24.0.9"), true);
  assert.equal(atLeast("20.10.1", "24.0.0"), false);
  assert.equal(atLeast("24", "24.0.0"), true);
  const requirement = node("999.0.0");
  assert.equal(installHint(requirement, "win32"), "winget install OpenJS.NodeJS.LTS");
  assert.equal(installHint(requirement, "darwin"), "brew install node");
  // No command for Linux: its link.
  assert.equal(installHint(requirement, "linux"), "https://nodejs.org");
  assert.equal(describeMissing({ requirement, found: false, ok: false }, "win32"), "Node.js (node 999.0.0 or later), which isn't on this computer: install it with `winget install OpenJS.NodeJS.LTS`");
  assert.equal(describeMissing({ requirement, found: true, version: "20.1.0", ok: false }, "linux"), "Node.js (node 999.0.0 or later), and this computer has 20.1.0: see https://nodejs.org");
});
