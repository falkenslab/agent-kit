import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { vaultPluginRoot, vaultPromptSection } from "../../src/core/vault.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const projectDir = path.resolve("/workspace");

function makeSpec(overrides: Partial<AgentSpec<BaseSessionConfig>> = {}): AgentSpec<BaseSessionConfig> {
  return {
    buildSystemPrompt: () => "BASE PROMPT",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
    ...overrides,
  };
}

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-test-"));

test("the vault plugin ships its manifest, skills and commands", () => {
  const root = vaultPluginRoot();
  assert.ok(fs.existsSync(path.join(root, ".claude-plugin", "plugin.json")));
  for (const skill of ["vault-pages", "vault-ingest", "vault-query", "vault-lint"]) {
    assert.ok(fs.existsSync(path.join(root, "skills", skill, "SKILL.md")), skill);
  }
  for (const command of ["ingest", "query", "lint"]) {
    assert.ok(fs.existsSync(path.join(root, "commands", `${command}.md`)), command);
  }
});

test("the prompt section names the project's real folders, and only mentions originals when there are some", () => {
  const withSources = vaultPromptSection(projectDir, path.join(projectDir, "knowledge"), path.join(projectDir, "sources"));
  assert.match(withSources, /## Knowledge vault \(knowledge\/\)/);
  assert.match(withSources, /Originals \(read-only for you\)\*\*: `sources\/`/);
  const withoutSources = vaultPromptSection(projectDir, path.join(projectDir, "knowledge"));
  assert.doesNotMatch(withoutSources, /Originals/);
});

test("with knowledgeDir set, the vault rules and plugin are added on top of the spec's own", async () => {
  const config: BaseSessionConfig = { mode: "autonomous", projectDir, knowledgeDir: path.join(projectDir, "knowledge") };
  const { options } = await buildSessionOptions(config, runDir, makeSpec({ pluginRoots: () => ["/own/plugin"] }));
  assert.match(options.systemPrompt as string, /^BASE PROMPT\n\n## Knowledge vault/);
  assert.deepEqual(
    options.plugins?.map((p) => p.path),
    ["/own/plugin", vaultPluginRoot()],
  );
});

test("vault: false, or no knowledgeDir, leaves the prompt and plugins alone", async () => {
  const optedOut = await buildSessionOptions(
    { mode: "autonomous", projectDir, knowledgeDir: path.join(projectDir, "knowledge") },
    runDir,
    makeSpec({ vault: false }),
  );
  assert.equal(optedOut.options.systemPrompt, "BASE PROMPT");
  assert.deepEqual(optedOut.options.plugins, []);

  const noKnowledge = await buildSessionOptions({ mode: "autonomous", projectDir, sourcesDir: path.join(projectDir, "sources") }, runDir, makeSpec());
  assert.equal(noKnowledge.options.systemPrompt, "BASE PROMPT");
  assert.deepEqual(noKnowledge.options.plugins, []);
});
