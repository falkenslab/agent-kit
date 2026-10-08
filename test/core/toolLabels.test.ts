import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { withToolLabels, withToolPhrases, type ToolLabels } from "../../src/core/toolLabels.js";
import { setLanguage } from "../../src/core/messages/index.js";
import { SUPPORTED_LANGUAGES } from "../../src/core/language.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";
import type { Extension } from "../../src/core/extensions.js";
import { sourcesToolLabels } from "../../src/extensions/sources/labels.js";
import { knowledgeToolLabels } from "../../src/extensions/knowledge/labels.js";
import { knowledge } from "../../src/extensions/knowledge/index.js";

afterEach(() => setLanguage("en"));

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "tool-labels-test-"));

const own: ToolLabels = { mcp__jokebook__classic_joke: { label: () => "Opening the jokebook", phrase: ["told {n} classic", "told {n} classics"] } };

test("an extension's labels come first; any other tool keeps the kit's (or the agent's)", () => {
  const label = withToolLabels(() => own);
  assert.equal(label("mcp__jokebook__classic_joke", {}), "Opening the jokebook");
  assert.equal(label("Read", { file_path: "notes.md" }), "Reading notes.md");
  assert.equal(label("mcp__jokebook__other_tool", {}), "[jokebook] other tool");
  assert.equal(withToolLabels(() => own, () => "the agent's")("Read", {}), "the agent's");
  // None (a session without extensions): the kit's.
  assert.equal(withToolLabels(() => undefined)("mcp__jokebook__classic_joke", {}), "[jokebook] classic joke");

  const phrase = withToolPhrases(() => own, (tool) => (tool === "mcp__x__y" ? ["did {n} y", "did {n} ys"] : undefined));
  assert.deepEqual(phrase("mcp__jokebook__classic_joke"), ["told {n} classic", "told {n} classics"]);
  assert.deepEqual(phrase("mcp__x__y"), ["did {n} y", "did {n} ys"]);
  assert.equal(phrase("Read"), undefined);
});

test("the kit's extensions label every tool of theirs, in each of the kit's languages", () => {
  for (const language of SUPPORTED_LANGUAGES) {
    setLanguage(language);
    const labels = { ...sourcesToolLabels(), ...knowledgeToolLabels() };
    assert.equal(Object.keys(labels).length, 16, language);
    for (const [tool, { label, phrase }] of Object.entries(labels)) {
      assert.ok(label({ page: "concept/x", query: "q", source: "a.pdf", url: "https://x", destination: "d.md", description: "a book" }), `${language} ${tool}`);
      assert.ok(phrase?.[1].includes("{n}"), `${language} ${tool}`);
    }
  }
  setLanguage("es");
  assert.equal(knowledgeToolLabels().mcp__knowledge__knowledge_read!.label({ page: "concept/x" }), "Leyendo concept/x");
  assert.equal(sourcesToolLabels().mcp__sourceFiles__list_sources!.label({}), "Revisando las fuentes");
});

test("buildSessionOptions() hands back the active extensions' labels", async () => {
  const projectDir = temp();
  const plugin = path.join(projectDir, "jokebook");
  fs.mkdirSync(path.join(plugin, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(plugin, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "jokebook", description: "Jokes." }));
  const jokebook: Extension = { name: "jokebook", plugin, contribute: async () => ({ toolLabels: own }) };
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, extensions: [knowledge({ dir: path.join(projectDir, "kb") }), jokebook] };
  const { toolLabels } = await buildSessionOptions({ mode: "guided", projectDir }, temp(), spec);
  assert.ok(toolLabels.mcp__jokebook__classic_joke);
  assert.ok(toolLabels.mcp__knowledge__knowledge_read);
  assert.equal(toolLabels.mcp__sourceFiles__list_sources, undefined);
});
