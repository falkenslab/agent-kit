import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clipboardSequence,
  createRowCache,
  highlightRow,
  isMouseReport,
  mouseEvents,
  rowsBelow,
  scrollBy,
  selectedText,
  visibleRows,
  wheelSteps,
} from "../../../src/tui/ink/fullscreen.js";

test("the view follows the bottom until scrolled, then stays on its rows", () => {
  assert.deepEqual(visibleRows(100, 10, null), [90, 100]);
  assert.deepEqual(visibleRows(5, 10, null), [0, 5]);
  // Anchored at row 49: the same rows whether 100 or 150 rows exist.
  assert.deepEqual(visibleRows(100, 10, 49), [40, 50]);
  assert.deepEqual(visibleRows(150, 10, 49), [40, 50]);
});

test("scrolling stops at the first page and goes back to following the bottom at the end", () => {
  assert.equal(scrollBy(null, -9, 100, 10), 90); // one page up from the bottom
  assert.equal(scrollBy(90, -9, 100, 10), 81);
  assert.equal(scrollBy(12, -9, 100, 10), 9); // never above the first page
  assert.equal(scrollBy(90, 9, 100, 10), null); // back at the bottom
  assert.equal(scrollBy(null, -9, 8, 10), null); // everything fits: nothing to scroll
});

test("rows below the view", () => {
  assert.equal(rowsBelow(null, 100), 0);
  assert.equal(rowsBelow(89, 100), 10);
});

test("mouse reports: the wheel is read and never mistaken for typed text", () => {
  assert.equal(wheelSteps("[<64;10;5M"), -1);
  assert.equal(wheelSteps("\x1b[<65;10;5M[<65;10;5M"), 2);
  assert.equal(wheelSteps("[<0;10;5M"), 0); // a click
  assert.equal(isMouseReport("[<0;10;5M[<0;10;5m"), true);
  assert.equal(isMouseReport("hola"), false);
  assert.equal(isMouseReport(""), false);
});

test("the row cache wraps only what was added, and everything again on a new width", () => {
  const rows = createRowCache();
  const a = { text: "a".repeat(25) };
  const b = { text: "b" };
  assert.deepEqual(rows([a], 10), { rows: ["a".repeat(10), "a".repeat(10), "a".repeat(5)], continued: [false, true, true] });
  assert.deepEqual(rows([a, b], 10), {
    rows: ["a".repeat(10), "a".repeat(10), "a".repeat(5), "b"],
    continued: [false, true, true, false],
  });
  assert.deepEqual(rows([a, b], 20), { rows: ["a".repeat(20), "a".repeat(5), "b"], continued: [false, true, false] });
});

test("mouse events: press, drag, release and wheel, with 0-based cells", () => {
  assert.deepEqual(mouseEvents("\x1b[<0;5;3M[<32;9;3M[<0;12;4m[<64;1;1M[<65;1;1M[<2;1;1M"), [
    { kind: "press", x: 4, y: 2 },
    { kind: "drag", x: 8, y: 2 },
    { kind: "release", x: 11, y: 3 },
    { kind: "wheel-up", x: 0, y: 0 },
    { kind: "wheel-down", x: 0, y: 0 },
    { kind: "other", x: 0, y: 0 },
  ]);
});

test("the selected text joins wrapped rows and breaks between lines, in either drag direction", () => {
  const wrapped = { rows: ["hello wor", "ld  ", "second line"], continued: [false, true, false] };
  const forward = { anchor: { row: 0, col: 6 }, focus: { row: 2, col: 5 } };
  assert.equal(selectedText(wrapped, forward), "world\nsecond");
  const backward = { anchor: forward.focus, focus: forward.anchor };
  assert.equal(selectedText(wrapped, backward), "world\nsecond");
  assert.equal(selectedText(wrapped, { anchor: { row: 2, col: 0 }, focus: { row: 2, col: 99 } }), "second line");
});

test("the highlight covers the selected columns of each row, colors kept outside it", () => {
  const selection = { anchor: { row: 0, col: 2 }, focus: { row: 1, col: 1 } };
  assert.equal(highlightRow("abcdef", selection, 0), "ab\x1b[7mcdef\x1b[27m");
  assert.equal(highlightRow("xyz", selection, 1), "\x1b[7mxy\x1b[27mz");
  assert.equal(highlightRow("untouched", selection, 2), "untouched");
  assert.equal(highlightRow("plain", null, 0), "plain");
});

test("the clipboard sequence is OSC 52 with the text in base64", () => {
  assert.equal(clipboardSequence("hola"), `\x1b]52;c;${Buffer.from("hola").toString("base64")}\x07`);
});
