import { test } from "node:test";
import assert from "node:assert/strict";
import { createConsoleRenderer } from "../../src/tui/consoleRenderer.js";
import type { AgentEvent } from "../../src/core/runner.js";

// Strips the ANSI colors so the assertions are about layout only.
// eslint-disable-next-line no-control-regex -- \x1b is the ESC byte SGR sequences start with, not an accident
const plain = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, "");

function capture(agentLabel?: string) {
  let out = "";
  const renderer = createConsoleRenderer({ agentLabel, formatAction: (name) => name, output: (text) => (out += text) });
  return { renderer, text: () => plain(out) };
}

const text = (t: string): AgentEvent => ({ type: "text", text: t });
const action = (toolName: string): AgentEvent => ({ type: "action", toolName, input: {} });

test("consecutive actions go on consecutive lines, with no blank line between them", () => {
  const { renderer, text: out } = capture();
  [action("Read"), action("Write"), action("Glob")].forEach(renderer.render);
  assert.equal(out(), "[action] Read\n[action] Write\n[action] Glob\n");
});

test("an action right after streamed text starts on a new line, without a blank one", () => {
  const { renderer, text: out } = capture();
  [text("I'll read"), text(" the file."), action("Read"), text("Done.")].forEach(renderer.render);
  assert.equal(out(), "I'll read the file.\n[action] Read\nDone.");
});

test("the agent label is printed once per turn, on a line of its own", () => {
  const { renderer, text: out } = capture("agent>");
  [text("Hello."), action("Read"), text("Going on.")].forEach(renderer.render);
  renderer.endLine();
  renderer.startTurn();
  renderer.render(text("Another turn."));
  assert.equal(out(), "agent> Hello.\n[action] Read\nGoing on.\nagent> Another turn.");
});

test("notices and failures end the current line first, and endLine is a no-op at a line start", () => {
  const { renderer, text: out } = capture();
  renderer.render(text("half done"));
  renderer.render({ type: "info", level: "info", text: "notice" } as AgentEvent);
  renderer.endLine();
  renderer.render({ type: "turn-end", status: "error", failed: true, resultText: null, errorText: "failed" });
  assert.equal(out(), "half done\n(notice)\nfailed\n");
  assert.equal(renderer.atLineStart, true);
});

test("onWrite sees exactly what was written", () => {
  let mirrored = "";
  const renderer = createConsoleRenderer({ formatAction: (n) => n, output: () => {}, onWrite: (t) => (mirrored += t) });
  [text("x"), action("Read")].forEach(renderer.render);
  assert.equal(plain(mirrored), "x\n[action] Read\n");
});

test("a task list prints the tasks that start and finish, not the TodoWrite calls", () => {
  const { renderer, text: out } = capture();
  const todos = (...statuses: string[]): AgentEvent => ({
    type: "action",
    toolName: "TodoWrite",
    input: { todos: statuses.map((status, i) => ({ content: `Task ${i + 1}`, status, activeForm: `Doing task ${i + 1}` })) },
  });
  renderer.render(todos("in_progress", "pending"));
  renderer.render(todos("in_progress", "pending")); // nothing changed: nothing printed
  renderer.render(todos("completed", "in_progress"));
  assert.equal(out(), "[task] ◼ Doing task 1\n[task] ☑ Task 1\n[task] ◼ Doing task 2\n");
});
