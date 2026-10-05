import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { knowledgePluginRoot, knowledgePromptSection } from "../../src/core/knowledge.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const projectDir = path.resolve("/workspace");

function makeSpec(overrides: Partial<AgentSpec<BaseSessionConfig>> = {}): AgentSpec<BaseSessionConfig> {
  return {
    buildSystemPrompt: () => "BASE PROMPT",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
    // The reply language line would depend on the machine's language (see language.test.ts).
    replyInLanguage: false,
    ...overrides,
  };
}

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-test-"));

test("the knowledge base's plugin ships its manifest, skills and commands, and no page templates (knowledge_create gives them)", () => {
  const root = knowledgePluginRoot();
  assert.ok(fs.existsSync(path.join(root, ".claude-plugin", "plugin.json")));
  for (const skill of ["knowledge-ingest", "knowledge-query", "knowledge-lint"]) assert.ok(fs.existsSync(path.join(root, "skills", skill, "SKILL.md")), skill);
  for (const command of ["ingest", "query", "lint"]) assert.ok(fs.existsSync(path.join(root, "commands", `${command}.md`)), command);
  assert.ok(!fs.existsSync(path.join(root, "skills", "knowledge-pages")));
});

test("the prompt section names the sources folder as it really is, and only mentions originals when there are some", () => {
  const withSources = knowledgePromptSection(projectDir, path.join(projectDir, "sources"));
  assert.match(withSources, /Originals \(read-only for you\)\*\*: `sources\/`/);
  const withoutSources = knowledgePromptSection(projectDir);
  assert.doesNotMatch(withoutSources, /Originals/);
});

test("the prompt section speaks of pages and tools, not files, and lists the page types", () => {
  const section = knowledgePromptSection(projectDir, path.join(projectDir, "sources"), {
    pageTypes: [{ type: "topic", dir: "", indexSection: "Topics", description: "A course topic.", template: "" }],
  });
  assert.match(section, /^## Knowledge base\n/);
  assert.match(section, /knowledge_search/);
  assert.match(section, /`topic` \(A course topic\.\)/);
  assert.doesNotMatch(section, /index\.md|`Grep`|`Write`|`Edit`/);
});

test("with knowledgeDir set, the knowledge base rules and plugin are added on top of the spec's own", async () => {
  const config: BaseSessionConfig = { mode: "autonomous", projectDir, knowledgeDir: path.join(projectDir, "knowledge") };
  const { options } = await buildSessionOptions(config, runDir, makeSpec({ pluginRoots: () => ["/own/plugin"] }));
  assert.match(options.systemPrompt as string, /^BASE PROMPT\n\n## Knowledge base/);
  assert.deepEqual(
    options.plugins?.map((p) => p.path),
    ["/own/plugin", knowledgePluginRoot()],
  );
});

test("the knowledge base is reached through its tools, never the file tools", async () => {
  const knowledgeDir = path.join(projectDir, "knowledge");
  const sourcesDir = path.join(projectDir, "sources");
  const store = await buildSessionOptions({ mode: "guided", projectDir, knowledgeDir, sourcesDir }, runDir, makeSpec());
  assert.ok(store.options.mcpServers?.knowledge);
  assert.ok(store.knowledgeStore);
  assert.deepEqual(store.options.tools?.filter((t) => ["Read", "Write", "Edit", "Glob", "Grep"].includes(t as string)), ["Read", "Glob", "Grep"]);
  assert.ok(!(store.options.additionalDirectories ?? []).includes(knowledgeDir));
  assert.match(store.options.systemPrompt as string, /knowledge_search/);

  // Only a knowledge folder: no file tools at all.
  const only = await buildSessionOptions({ mode: "autonomous", projectDir, knowledgeDir }, runDir, makeSpec());
  assert.deepEqual(only.options.tools?.filter((t) => ["Read", "Write", "Edit", "Glob", "Grep"].includes(t as string)), []);
});

test("knowledgeBase: false, or no knowledgeDir, leaves the prompt and plugins alone; with knowledgeBase: false, knowledgeDir is the agent's own notes", async () => {
  const optedOut = await buildSessionOptions(
    { mode: "autonomous", projectDir, knowledgeDir: path.join(projectDir, "knowledge") },
    runDir,
    makeSpec({ knowledgeBase: false }),
  );
  assert.equal(optedOut.options.systemPrompt, "BASE PROMPT");
  assert.deepEqual(optedOut.options.plugins, []);
  assert.equal(optedOut.options.mcpServers?.knowledge, undefined);
  assert.ok(["Read", "Write", "Edit", "Glob", "Grep"].every((tool) => optedOut.options.tools?.includes(tool)));

  const noKnowledge = await buildSessionOptions({ mode: "autonomous", projectDir, sourcesDir: path.join(projectDir, "sources") }, runDir, makeSpec());
  assert.equal(noKnowledge.options.systemPrompt, "BASE PROMPT");
  assert.deepEqual(noKnowledge.options.plugins, []);
});
