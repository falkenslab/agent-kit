import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { replyLanguageInstruction } from "../../src/core/language.js";
import { knowledgePromptSection } from "../../src/core/knowledge.js";
import { unescapedText } from "../../src/core/tools/knowledgeTools.js";

test("the language line covers what the agent keeps, not only its replies (found by a real session)", () => {
  // A preference page came out in Spanish while the chat was in English: the person's name was Spanish.
  const line = replyLanguageInstruction("en");
  assert.match(line, /use English both to reply and for everything you keep \(knowledge base pages, preferences, notes, the log\)/);
  assert.match(line, /Switch both to another language/);
  assert.match(line, /your sources or the human's name/);
  assert.match(knowledgePromptSection(), /Write page content in the language you reply in, not in the language of your sources or of the person's name\./);
});

test("no tool asks for \"the person's language\", which the model reads as the language of their name", () => {
  for (const file of ["tools/humanApproval.ts", "tools/knowledgeTools.ts", "tools/saveToSources.ts", "knowledge.ts"]) {
    assert.doesNotMatch(fs.readFileSync(path.resolve("src/core", file), "utf8"), /person's language/, file);
  }
  assert.doesNotMatch(fs.readFileSync(path.resolve("assets/agent-help/SKILL.md"), "utf8"), /person's language/);
});

test("a page body sent with escaped newlines gets them back (found by a real session)", () => {
  assert.equal(unescapedText("## Preference\\nAlways end with Yo-ho.\\n\\n## Why\\n- Asked."), "## Preference\nAlways end with Yo-ho.\n\n## Why\n- Asked.");
  assert.equal(unescapedText("Line one\\r\\nLine two"), "Line one\nLine two");
  // A body with real newlines is left as it is, a literal "\n" in code included.
  assert.equal(unescapedText("Use `\\n` for a new line.\nSecond line."), "Use `\\n` for a new line.\nSecond line.");
  assert.equal(unescapedText("One line, no escapes."), "One line, no escapes.");
});
