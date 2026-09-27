import { test } from "node:test";
import assert from "node:assert/strict";
import {
  continueLine,
  createPasteRegistry,
  cursorLine,
  deleteWordBack,
  isBlockPaste,
  killToLineEnd,
  moveLine,
  normalizePaste,
  searchHistory,
  toLineEnd,
  toLineStart,
  wordLeft,
  wordRight,
} from "../../../src/tui/ink/promptEditing.js";

const at = (text: string) => ({ value: text.replace("|", ""), cursor: text.indexOf("|") });
const show = ({ value, cursor }: { value: string; cursor: number }) => `${value.slice(0, cursor)}|${value.slice(cursor)}`;

test("word shortcuts", () => {
  assert.equal(show(deleteWordBack(at("hola mundo  |bello"))), "hola |bello");
  assert.equal(show(wordLeft(at("hola mundo|"))), "hola |mundo");
  assert.equal(show(wordLeft(at("hola |mundo"))), "|hola mundo");
  assert.equal(show(wordRight(at("|hola mundo"))), "hola| mundo");
  assert.equal(show(wordRight(at("hola| mundo"))), "hola mundo|");
});

test("line shortcuts act on the cursor's line in a multi-line prompt", () => {
  assert.equal(show(killToLineEnd(at("uno\ndo|s tres\ncuatro"))), "uno\ndo|\ncuatro");
  assert.equal(show(toLineStart(at("uno\ndos| tres"))), "uno\n|dos tres");
  assert.equal(show(toLineEnd(at("uno\n|dos tres\ncuatro"))), "uno\ndos tres|\ncuatro");
  assert.deepEqual(cursorLine(at("uno\ndo|s")), { line: 1, column: 2 });
});

test("↑/↓ move between lines, keeping the column, and leave at the first/last line", () => {
  assert.equal(show(moveLine(at("uno\ndos|"), -1)!), "uno|\ndos");
  assert.equal(show(moveLine(at("largo|\nx"), 1)!), "largo\nx|");
  assert.equal(moveLine(at("uno|\ndos"), -1), null);
  assert.equal(moveLine(at("uno\ndos|"), 1), null);
});

test("a backslash before Enter continues on a new line", () => {
  assert.equal(show(continueLine(at("primera\\|"))!), "primera\n|");
  assert.equal(continueLine(at("sin barra|")), null);
});

test("pasted blocks become tokens and expand back, also grown in pieces", () => {
  const pastes = createPasteRegistry();
  assert.equal(isBlockPaste("una línea"), false);
  assert.equal(isBlockPaste("a\r\nb"), true);
  assert.equal(normalizePaste("a\r\nb\rc"), "a\nb\nc");

  const token = pastes.add("a\nb\nc");
  assert.equal(token, "[Pasted text #1 +2 lines]");
  const grown = pastes.extend(token, "\nd");
  assert.equal(grown, "[Pasted text #1 +3 lines]");
  assert.equal(pastes.expand(`mira esto: ${grown} ¿vale?`), "mira esto: a\nb\nc\nd ¿vale?");
  assert.equal(pastes.add("x\ny"), "[Pasted text #2 +1 line]");
});

test("Ctrl+R searches back from the newest, case-insensitively", () => {
  const history = ["hola capitán", "un chiste", "otro CHISTE", "adiós"];
  assert.equal(searchHistory(history, "chiste"), 2);
  assert.equal(searchHistory(history, "chiste", 2), 1);
  assert.equal(searchHistory(history, "chiste", 1), -1);
  assert.equal(searchHistory(history, ""), -1);
});
