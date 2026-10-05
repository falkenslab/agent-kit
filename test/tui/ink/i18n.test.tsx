/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import stringWidth from "string-width";
import { render, cleanup } from "ink-testing-library";
import { SUPPORTED_LANGUAGES } from "../../../src/core/language.js";
import { setLanguage } from "../../../src/core/messages/index.js";
import { createSessionModel, liveWidth } from "../../../src/tui/ink/sessionModel.js";
import { createInkInteraction } from "../../../src/tui/ink/inkInteraction.js";
import { SessionView, statusText } from "../../../src/tui/ink/SessionView.js";
import { toolGroupSummary } from "../../../src/tui/ink/toolGroup.js";
import { createPasteRegistry } from "../../../src/tui/ink/promptEditing.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

afterEach(() => {
  cleanup();
  setLanguage("en");
});

test("the busiest status bar fits an 80-column terminal in every language", () => {
  for (const language of SUPPORTED_LANGUAGES) {
    setLanguage(language);
    const text = statusText("interactive", 99, { inputTokens: 1_999_800, cacheReadTokens: 999_900, outputTokens: 99_900, costUsd: 0 }, { contextPercent: 100, modeSwitchable: true, width: liveWidth(80) });
    assert.ok(stringWidth(text) <= liveWidth(80), `${language}: ${text} (${stringWidth(text)})`);
  }
});

async function frame(language: "en" | "es" | "de"): Promise<string> {
  setLanguage(language);
  const model = createSessionModel();
  const interaction = createInkInteraction((text) => model.note(text));
  const view = render(<SessionView model={model} interaction={interaction} mode="guided" />);
  model.startTurn();
  model.render({ type: "action", toolName: "Read", input: { file_path: "notes.md" }, toolUseId: "1" });
  await settle();
  return stripAnsi(view.lastFrame() ?? "");
}

test("the session view in two languages", async () => {
  const english = await frame("en");
  assert.match(english, /● Reading notes\.md/);
  assert.match(english, /esc to interrupt/);
  assert.match(english, /⏵⏵ guided · 0 turns/);
  cleanup();

  const spanish = await frame("es");
  assert.match(spanish, /● Leyendo notes\.md/);
  assert.match(spanish, /esc para interrumpir/);
  assert.match(spanish, /⏵⏵ guiado · 0 turnos/);
});

test("tool group summaries and paste tokens in another language", () => {
  setLanguage("de");
  const call = (toolName: string) => ({ toolName, label: toolName, result: null });
  assert.equal(toolGroupSummary([call("Read"), call("Read"), call("Bash")]), "Hat 2 Dateien gelesen, hat 1 Befehl ausgeführt");
  const pastes = createPasteRegistry();
  const token = pastes.add("one\ntwo\nthree");
  assert.equal(token, "[Eingefügter Text #1 +2 Zeilen]");
  assert.equal(pastes.expand(`look: ${token}`), "look: one\ntwo\nthree");
});
