import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { outsideArchive, unpackedClaudeExecutable } from "../../src/core/packaged.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const temp = () => mkdtempSync(path.join(tmpdir(), "packaged-test-"));

test("a path inside app.asar becomes the unpacked copy's; any other stays", () => {
  assert.equal(outsideArchive("C:\\App\\resources\\app.asar\\node_modules\\kit\\extensions\\knowledge"), "C:\\App\\resources\\app.asar.unpacked\\node_modules\\kit\\extensions\\knowledge");
  assert.equal(outsideArchive("/opt/App/resources/app.asar/node_modules/kit"), "/opt/App/resources/app.asar.unpacked/node_modules/kit");
  assert.equal(outsideArchive("/opt/App/resources/app.asar.unpacked/x"), "/opt/App/resources/app.asar.unpacked/x");
  assert.equal(outsideArchive("/home/me/my-app.asar/x"), "/home/me/my-app.asar/x");
  assert.equal(outsideArchive("/home/me/project/plugin"), "/home/me/project/plugin");
});

test("the CLI binary is taken unpacked when the SDK's platform package resolves inside an archive", () => {
  const resources = path.join(temp(), "resources");
  const binary = (archive: string, suffix: string) => path.join(resources, archive, "node_modules", "@anthropic-ai", `claude-agent-sdk-${suffix}`, "claude.exe");
  mkdirSync(path.dirname(binary("app.asar.unpacked", "win32-x64")), { recursive: true });
  writeFileSync(binary("app.asar.unpacked", "win32-x64"), "");
  const insideArchive = (request: string) => {
    assert.equal(request, "@anthropic-ai/claude-agent-sdk-win32-x64/claude.exe");
    return binary("app.asar", "win32-x64");
  };
  assert.equal(unpackedClaudeExecutable(insideArchive, "win32", "x64"), binary("app.asar.unpacked", "win32-x64"));
  // Not packaged: the SDK finds its own.
  assert.equal(unpackedClaudeExecutable(() => "/project/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude", "linux", "x64"), undefined);
  // Packaged but not unpacked by the build: nothing better to give.
  assert.equal(unpackedClaudeExecutable(() => binary("app.asar", "darwin-arm64").replace("claude.exe", "claude"), "darwin", "arm64"), undefined);
  // Linux tries both libcs; a package that isn't installed is skipped.
  const tried: string[] = [];
  unpackedClaudeExecutable((request) => {
    tried.push(request);
    throw new Error("not installed");
  }, "linux", "arm64");
  assert.deepEqual(tried, ["@anthropic-ai/claude-agent-sdk-linux-arm64/claude", "@anthropic-ai/claude-agent-sdk-linux-arm64-musl/claude"]);
});

test("the session hands the CLI its plugins outside the archive", async () => {
  const inside = path.join(temp(), "resources", "app.asar", "plugin");
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [inside], buildSubagents: () => undefined };
  const { options } = await buildSessionOptions({ mode: "guided", projectDir: temp() }, temp(), spec);
  assert.deepEqual(options.plugins?.map((plugin) => plugin.path), [outsideArchive(inside)]);
  assert.equal(options.pathToClaudeCodeExecutable, undefined); // not packaged here
});
