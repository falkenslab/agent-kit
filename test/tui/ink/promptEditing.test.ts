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
  assert.equal(show(deleteWordBack(at("hello world  |there"))), "hello |there");
  assert.equal(show(wordLeft(at("hello world|"))), "hello |world");
  assert.equal(show(wordLeft(at("hello |world"))), "|hello world");
  assert.equal(show(wordRight(at("|hello world"))), "hello| world");
  assert.equal(show(wordRight(at("hello| world"))), "hello world|");
});

test("line shortcuts act on the cursor's line in a multi-line prompt", () => {
  assert.equal(show(killToLineEnd(at("one\ntw|o three\nfour"))), "one\ntw|\nfour");
  assert.equal(show(toLineStart(at("one\ntwo| three"))), "one\n|two three");
  assert.equal(show(toLineEnd(at("one\n|two three\nfour"))), "one\ntwo three|\nfour");
  assert.deepEqual(cursorLine(at("one\ntw|o")), { line: 1, column: 2 });
});

test("↑/↓ move between lines, keeping the column, and leave at the first/last line", () => {
  assert.equal(show(moveLine(at("one\ntwo|"), -1)!), "one|\ntwo");
  assert.equal(show(moveLine(at("long|\nx"), 1)!), "long\nx|");
  assert.equal(moveLine(at("one|\ntwo"), -1), null);
  assert.equal(moveLine(at("one\ntwo|"), 1), null);
});

test("a backslash before Enter continues on a new line", () => {
  assert.equal(show(continueLine(at("first\\|"))!), "first\n|");
  assert.equal(continueLine(at("no backslash|")), null);
});

test("pasted blocks become tokens and expand back, also grown in pieces", () => {
  const pastes = createPasteRegistry();
  assert.equal(isBlockPaste("a single line"), false);
  assert.equal(isBlockPaste("a\r\nb"), true);
  assert.equal(normalizePaste("a\r\nb\rc"), "a\nb\nc");

  const token = pastes.add("a\nb\nc");
  assert.equal(token, "[Pasted text #1 +2 lines]");
  const grown = pastes.extend(token, "\nd");
  assert.equal(grown, "[Pasted text #1 +3 lines]");
  assert.equal(pastes.expand(`look at this: ${grown} ok?`), "look at this: a\nb\nc\nd ok?");
  assert.equal(pastes.add("x\ny"), "[Pasted text #2 +1 line]");
});

test("Ctrl+R searches back from the newest, case-insensitively", () => {
  const history = ["hello captain", "a joke", "another JOKE", "bye"];
  assert.equal(searchHistory(history, "joke"), 2);
  assert.equal(searchHistory(history, "joke", 2), 1);
  assert.equal(searchHistory(history, "joke", 1), -1);
  assert.equal(searchHistory(history, ""), -1);
});
