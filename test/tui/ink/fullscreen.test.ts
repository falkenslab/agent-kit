import { test } from "node:test";
import assert from "node:assert/strict";
import { createRowCache, isMouseReport, rowsBelow, scrollBy, visibleRows, wheelSteps } from "../../../src/tui/ink/fullscreen.js";

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
  assert.deepEqual(rows([a], 10), ["a".repeat(10), "a".repeat(10), "a".repeat(5)]);
  assert.deepEqual(rows([a, b], 10), ["a".repeat(10), "a".repeat(10), "a".repeat(5), "b"]);
  assert.deepEqual(rows([a, b], 20), ["a".repeat(20), "a".repeat(5), "b"]);
});
