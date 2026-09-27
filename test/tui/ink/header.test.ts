import { test } from "node:test";
import assert from "node:assert/strict";
import pc from "picocolors";
import { headerLines } from "../../../src/tui/ink/header.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const plain = (lines: string[]) => lines.map(stripAnsi);

test("without art: the title and the fields", () => {
  assert.deepEqual(plain(headerLines({ title: "Captain", fields: { mode: "guided", run: "1" } })), ["Captain", "mode guided   run 1"]);
  assert.deepEqual(plain(headerLines({ title: "Captain" })), ["Captain"]);
});

test("with art: the text sits right of it, vertically centered, aligned in columns", () => {
  const art = [pc.gray("  ▄▄▄"), pc.yellow(" /\\_/\\"), `${pc.yellow("( o.")}${pc.gray("█")}${pc.yellow(" )")}`, " > ^ <", ""];
  const lines = plain(headerLines({ title: "Captain", fields: { mode: "guided" }, art }));
  assert.deepEqual(lines, ["  ▄▄▄", " /\\_/\\   Captain", "( o.█ )  mode guided", " > ^ <", ""]);
});
