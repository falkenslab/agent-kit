import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { quietResults, withToolResults, type ToolLabels } from "../../src/core/toolLabels.js";
import { addExtension, loadExternalExtensions } from "../../src/core/externalExtensions.js";
import { knowledge } from "../../src/extensions/knowledge/index.js";
import { setLanguage } from "../../src/core/messages/index.js";
import { metadataProblems } from "../../packages/agent-kit-catalog/agent-kit-catalog.mjs";

// The chat doesn't show English tool results under translated labels (#79).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "tool-results-test-"));
const ok = { isError: false, text: "The knowledge base is empty." };
const failed = { isError: true, text: "No such page." };

test("the kit's own tools whose label says what happened hide their result line, unless it failed", async () => {
  setLanguage("es");
  const contribution = await knowledge({ dir: temp() }).contribute({ config: { mode: "guided", projectDir: temp() }, capabilities: new Set<string>(), mode: "guided", interactive: true } as never);
  const index = contribution.toolLabels!["mcp__knowledge__knowledge_index"]!;
  assert.equal(index.result?.(ok), null);
  assert.equal(index.result?.(failed), undefined);
  setLanguage("en");
});

test("the agent's formatResult comes first, then the labels', then the result's first line", () => {
  const labels: ToolLabels = { ...quietResults({ mcp__kb__index: { label: () => "Reading the index" } }), mcp__kb__read: { label: () => "Reading", result: () => "Leído" } };
  const format = withToolResults(() => labels, (tool) => (tool === "mcp__kb__read" ? "the agent's" : undefined));
  assert.equal(format("mcp__kb__index", ok), null);
  assert.equal(format("mcp__kb__index", failed), undefined);
  assert.equal(format("mcp__kb__read", ok), "the agent's");
  assert.equal(format("mcp__other__tool", ok), undefined);
  assert.equal(withToolResults(() => labels)("mcp__kb__read", ok), "Leído");
});

test("an extension's manifest gives a result line in the person's language, and a failure keeps its own", async () => {
  const dir = path.join(temp(), "campus");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  const labels = { login: { en: { label: "Signing in", result: "Signed in" }, es: { label: "Iniciando sesión", result: "Sesión iniciada" } } };
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "campus", description: "A campus.", metadata: { "agent-kit": { labels } } }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { api: { type: "http", url: "https://mcp.example.com/mcp" } } }));
  const scope = path.join(temp(), "extensions");
  await addExtension(dir, scope);
  setLanguage("es");
  const [extension] = (await loadExternalExtensions({ agent: scope })).extensions;
  const label = (await extension!.contribute({} as never)).toolLabels!["mcp__campus-api__login"]!;
  assert.equal(label.result?.(ok), "Sesión iniciada");
  assert.equal(label.result?.(failed), undefined);
  setLanguage("en");
  // The catalog generator takes it, and refuses one that isn't a text.
  assert.deepEqual(metadataProblems({ labels }), []);
  assert.match(metadataProblems({ labels: { login: { en: { label: "x", result: 3 } } } }).join("\n"), /result for login isn't a text/);
});
