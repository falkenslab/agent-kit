import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, languageArgument, replyLanguageInstruction, resolveLanguage, toLanguage } from "../../src/core/language.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

test("--language wins over the agent's option, which wins over the system's language", () => {
  const system = { locale: "fr-FR", env: { LANG: "de_DE.UTF-8" } };
  assert.equal(resolveLanguage({ ...system, argv: ["--language=es"], option: "de" }).language, "es");
  assert.equal(resolveLanguage({ ...system, argv: [], option: "de" }).language, "de");
  assert.equal(resolveLanguage({ ...system, argv: [] }).language, "fr");
  assert.equal(resolveLanguage({ env: { LANG: "de_DE.UTF-8" } }).language, "de");
  assert.equal(resolveLanguage({ locale: "it-IT", env: {} }).language, "en");
});

test("an unsupported code warns and falls through to the next source", () => {
  const resolved = resolveLanguage({ argv: ["--language=it"], option: "es", locale: "fr-FR" });
  assert.equal(resolved.language, "es");
  assert.equal(resolved.warnings.length, 1);
  assert.match(resolved.warnings[0], /"it"/);
  assert.deepEqual(resolveLanguage({ option: "es" }).warnings, []);
});

test("language codes are read loosely, and --language in either form", () => {
  assert.equal(toLanguage("ES"), "es");
  assert.equal(toLanguage("es_ES.UTF-8"), "es");
  assert.equal(toLanguage("de-AT"), "de");
  assert.equal(toLanguage("C"), null);
  assert.equal(languageArgument(["--language", "fr"]), "fr");
  assert.equal(languageArgument(["x", "--language=de"]), "de");
  assert.equal(languageArgument(["--lang=de"]), undefined);
});

const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "language-test-"));
const projectDir = path.resolve("/workspace");

function makeSpec(overrides: Partial<AgentSpec<BaseSessionConfig>> = {}): AgentSpec<BaseSessionConfig> {
  return {
    buildSystemPrompt: () => "BASE PROMPT",
    buildMcpServers: () => ({}),
    pluginRoots: () => ["/own/plugin"],
    buildSubagents: () => ({ agents: { helper: { description: "d", prompt: "HELPER PROMPT", tools: [] } }, allowedSubagentTypes: ["helper"] }),
    ...overrides,
  };
}

test("the agent and each subagent are told to reply in the configured language", async () => {
  const { options, language } = await buildSessionOptions({ mode: "autonomous", projectDir, language: "de" }, runDir, makeSpec());
  // --language on the test runner's own command line would win; it has none.
  assert.equal(language, "de");
  assert.equal(options.systemPrompt, `BASE PROMPT\n\n${replyLanguageInstruction("de")}`);
  assert.equal(options.agents?.helper.prompt, `HELPER PROMPT\n\n${replyLanguageInstruction("de")}`);
  assert.match(replyLanguageInstruction("de"), /German/);
});

test("text for the model stays in English whatever the language, but for the language's name", async () => {
  for (const language of SUPPORTED_LANGUAGES) {
    const { options } = await buildSessionOptions({ mode: "autonomous", projectDir, language }, runDir, makeSpec());
    assert.equal(options.systemPrompt, `BASE PROMPT\n\n${replyLanguageInstruction(language)}`);
    assert.equal(replyLanguageInstruction(language), replyLanguageInstruction("en").replaceAll("English", LANGUAGE_NAMES[language]));
  }
});

test("replyInLanguage: false leaves the prompts as the agent wrote them", async () => {
  const { options } = await buildSessionOptions({ mode: "autonomous", projectDir, language: "de" }, runDir, makeSpec({ replyInLanguage: false }));
  assert.equal(options.systemPrompt, "BASE PROMPT");
  assert.equal(options.agents?.helper.prompt, "HELPER PROMPT");
});

test("settingSources defaults to the project's only; a spec can choose its own", async () => {
  const byDefault = await buildSessionOptions({ mode: "autonomous", projectDir }, runDir, makeSpec());
  assert.deepEqual(byDefault.options.settingSources, ["project"]);
  // Nor the runner's auto-memory or git context.
  assert.deepEqual(byDefault.options.settings, { autoCompactEnabled: true, autoMemoryEnabled: false, includeGitInstructions: false });
  const isolated = await buildSessionOptions({ mode: "autonomous", projectDir }, runDir, makeSpec({ settingSources: [] }));
  assert.deepEqual(isolated.options.settingSources, []);
});

test("skills: every one by default; a spec's list gets the knowledge base's added when it's on", async () => {
  const byDefault = await buildSessionOptions({ mode: "autonomous", projectDir }, runDir, makeSpec());
  assert.equal(byDefault.options.skills, "all");
  const listed = await buildSessionOptions({ mode: "autonomous", projectDir }, runDir, makeSpec({ skills: ["own:joke"] }));
  assert.deepEqual(listed.options.skills, ["own:joke"]);
  const withKnowledge = await buildSessionOptions(
    { mode: "autonomous", projectDir, knowledgeDir: path.join(projectDir, "knowledge") },
    runDir,
    makeSpec({ skills: ["own:joke"] }),
  );
  assert.deepEqual(withKnowledge.options.skills, ["own:joke", "knowledge:knowledge-ingest", "knowledge:knowledge-query", "knowledge:knowledge-lint"]);
});
