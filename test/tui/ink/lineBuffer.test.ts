import { test } from "node:test";
import assert from "node:assert/strict";
import pc from "picocolors";
import { createLineBuffer, stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

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
