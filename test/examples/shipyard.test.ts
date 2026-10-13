import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readExternalManifest, inKitRange } from "../../src/core/externalExtensions.js";
import { agentKitVersion } from "../../src/core/version.js";

// Captain Whiskers' official marketplace and the kit's own plugins, checked as Claude Code checks
// them, strictly (a warning fails, as a marketplace's CI should run it): with the CLI the SDK
// brings, which comes as a native binary per platform. Skipped where there's none.
const binary = path.resolve("node_modules", "@anthropic-ai", `claude-agent-sdk-${process.platform}-${process.arch}`, process.platform === "win32" ? "claude.exe" : "claude");
const plugins = ["examples/captain-whiskers/extensions", "examples/captain-whiskers/extensions/jokebook", ...fs.readdirSync("extensions").map((name) => `extensions/${name}`)];

for (const plugin of plugins) {
  test(`${plugin} passes claude plugin validate --strict`, { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform" }, () => {
    const output = execFileSync(binary, ["plugin", "validate", "--strict", path.resolve(plugin)], { encoding: "utf8", timeout: 60_000 });
    assert.match(output, /Validation passed/, output);
  });
}

test("the jokebook works with this kit", async () => {
  const manifest = await readExternalManifest(path.resolve("examples/captain-whiskers/extensions/jokebook"));
  assert.ok(manifest.kit && inKitRange(agentKitVersion(), manifest.kit), `the jokebook says agent-kit ${manifest.kit}, and the kit is ${agentKitVersion()}`);
});
