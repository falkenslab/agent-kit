import { test } from "node:test";
import assert from "node:assert/strict";
import pc from "picocolors";
import stringWidth from "string-width";
import { createLineBuffer, fitWidth, stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

test("keeps the unfinished line apart until its newline arrives", () => {
  const buffer = createLineBuffer();
  assert.deepEqual(buffer.push("Hello, "), []);
  assert.equal(buffer.partial, "Hello, ");
  assert.deepEqual(buffer.push("world\nNext"), ["Hello, world"]);
  assert.equal(buffer.partial, "Next");
  assert.deepEqual(buffer.push("\n\n"), ["Next", ""]);
  assert.equal(buffer.partial, "");
});

test("a color spanning a newline is closed on one line and reopened on the next", () => {
  const buffer = createLineBuffer();
  const lines = buffer.push("\x1b[96mfirst\nsecond\x1b[39m\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "\x1b[96mfirst\x1b[0m");
  assert.equal(lines[1], "\x1b[96msecond\x1b[39m");
  assert.deepEqual(lines.map(stripAnsi), ["first", "second"]);
});

test("the line in progress carries the color still open", () => {
  const buffer = createLineBuffer();
  buffer.push(`${pc.bold("\x1b[35mdone\n")}going`);
  assert.equal(stripAnsi(buffer.partial), "going");
  assert.ok(buffer.partial.startsWith("\x1b["));
});

test("wrap() moves full rows out of the line in progress, at word boundaries, losing nothing", () => {
  const buffer = createLineBuffer();
  const reply = "Captain Whiskers> Arrr, sailor! 🐱☠️ Captain Whiskers reportin' aboard, ready to set sail ";
  buffer.push(pc.cyan(reply));
  const rows = buffer.wrap(30);

  assert.ok(rows.length >= 2);
  for (const row of [...rows, buffer.partial]) assert.ok(stringWidth(stripAnsi(row)) <= 30, row);
  assert.equal([...rows, buffer.partial].map(stripAnsi).join(""), reply);

  // The next streamed word joins the row still in progress, with its space kept.
  buffer.push("towards");
  assert.match(stripAnsi(buffer.partial), / towards$/);
});

test("wrap() leaves a line that fits alone", () => {
  const buffer = createLineBuffer();
  buffer.push("short");
  assert.deepEqual(buffer.wrap(30), []);
  assert.equal(buffer.partial, "short");
});

test("fitWidth() cuts a label to one row with an ellipsis", () => {
  assert.equal(fitWidth("short", 10), "short");
  const cut = fitWidth("[action] Read C:/a/very/long/path/to/a/file.ts", 20);
  assert.equal(stringWidth(stripAnsi(cut)), 20);
  assert.ok(cut.endsWith("…"));
});
