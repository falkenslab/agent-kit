import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, applyTheme, getTheme, inkColor, paint, setTheme } from "../../src/tui/theme.js";
import * as ui from "../../src/tui/ui.js";
import { resultSummary } from "../../src/tui/ink/toolGroup.js";
import { stripAnsi } from "../../src/tui/ink/lineBuffer.js";

afterEach(() => setTheme());

test("a partial theme changes only the roles given", () => {
  setTheme({ toolResult: "yellow", selection: "#00ff00" });
  assert.equal(getTheme().toolResult, "yellow");
  assert.equal(getTheme().selection, "#00ff00");
  assert.equal(getTheme().agent, DEFAULT_THEME.agent);
  assert.equal(getTheme().error, DEFAULT_THEME.error);
  // A second theme starts from the defaults again, not from the first one.
  setTheme({ agent: "green" });
  assert.equal(getTheme().toolResult, DEFAULT_THEME.toolResult);
});

test("an entry point without a theme keeps the one already set", () => {
  setTheme({ agent: "green" });
  applyTheme(undefined);
  assert.equal(getTheme().agent, "green");
  applyTheme({ user: "red" });
  assert.equal(getTheme().agent, DEFAULT_THEME.agent);
});

test("names, hexes and functions paint text; without color support it stays plain", () => {
  assert.equal(paint("red", "x", { enabled: true }), "\x1b[31mx\x1b[39m");
  assert.equal(paint("#ff8800", "x", { enabled: true }), "\x1b[38;2;255;136;0mx\x1b[39m");
  assert.equal(paint("#373737", "x", { enabled: true, background: true }), "\x1b[48;2;55;55;55mx\x1b[49m");
  assert.equal(paint("red", "x", { enabled: true, background: true }), "\x1b[41mx\x1b[49m");
  assert.equal(paint((text) => `<${text}>`, "x"), "<x>");
  assert.equal(paint("red", "x", { enabled: false }), "x");
  assert.equal(paint("not-a-color", "x", { enabled: true }), "x");
});

test("the kit's palette follows the theme, the agent's own texts included", () => {
  setTheme({ agent: (text) => `[${text}]`, toolResult: (text) => `(${text})` });
  assert.equal(ui.agent("Captain>"), "[Captain>]");
  assert.equal(resultSummary({ isError: false, text: "done" }), "(done)");
  // An error keeps the error color, not the result's.
  assert.equal(stripAnsi(resultSummary({ isError: true, text: "boom" })), "boom");
  assert.doesNotMatch(resultSummary({ isError: true, text: "boom" }), /\(boom\)/);
});

test("a subagent's answer is dimmed as plain text, so its markdown can't cancel the color", () => {
  setTheme({ toolResult: (text) => `(${text})` });
  assert.equal(resultSummary({ isError: false, text: "**Found** 3 jokes" }, true), "(Found 3 jokes)");
});

test("roles drawn by Ink props take names and hexes; a function falls back to the default", () => {
  setTheme({ border: "#123456", selection: (text) => text });
  assert.equal(inkColor("border"), "#123456");
  assert.equal(inkColor("selection"), DEFAULT_THEME.selection);
});
