import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Captain Whiskers' official marketplace, checked as Claude Code checks one: with the CLI the SDK
// brings, which comes as a native binary per platform. Skipped where there's none.
const binary = path.resolve("node_modules", "@anthropic-ai", `claude-agent-sdk-${process.platform}-${process.arch}`, process.platform === "win32" ? "claude.exe" : "claude");

test("the shipyard passes claude plugin validate", { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform" }, () => {
  // Only the kit's own "agent-kit" key in a plugin is a warning: Claude Code ignores it.
  const output = execFileSync(binary, ["plugin", "validate", path.resolve("examples/captain-whiskers/extensions")], { encoding: "utf8", timeout: 60_000 });
  assert.match(output, /Validation passed/);
  const warnings = [...output.matchAll(/❯ (.+)/g)].map((match) => match[1]!);
  assert.ok(warnings.every((warning) => /Unknown field 'agent-kit'/.test(warning)), warnings.join("\n"));
});
