import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentEvent } from "../../../src/core/runner.js";
import { createConsoleRenderer } from "../../../src/tui/consoleRenderer.js";
import { createSessionModel, liveWidth } from "../../../src/tui/ink/sessionModel.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const formatAction = (toolName: string) => `run ${toolName}`;

const EVENTS: AgentEvent[] = [
  { type: "text", text: "Looking" },
  { type: "text", text: " around.\nOne moment" },
  { type: "action", toolName: "Read", input: {} },
  { type: "subagent-action", toolName: "Grep", input: {} },
  { type: "text", text: "Done." },
  {
    type: "turn-end",
    status: "success",
    failed: false,
    resultText: "Done.",
    errorText: "",
    usage: { inputTokens: 1200, outputTokens: 80, costUsd: 0.01 },
  },
];

test("the model logs exactly what the console renderer prints", () => {
  let consoleText = "";
  const renderer = createConsoleRenderer({ formatAction, agentLabel: "bot>", output: (text) => (consoleText += text) });
  renderer.startTurn();
  for (const event of EVENTS) renderer.render(event);
  renderer.endLine();

  let logged = "";
  const model = createSessionModel({ formatAction, agentLabel: "bot>", onWrite: (text) => (logged += text) });
  model.startTurn();
  for (const event of EVENTS) model.render(event);
  model.endTurn();

  assert.equal(logged, consoleText);
  // Same text on screen; only the blank lines between kinds of output differ.
  const nonBlank = (lines: string[]) => lines.map(stripAnsi).filter((line) => line.trim() !== "");
  assert.deepEqual(nonBlank(model.getSnapshot().items.map((item) => item.text)), nonBlank(consoleText.split("\n")));
});

test("tracks the current action, the subagent's and the session usage", () => {
  const model = createSessionModel({ formatAction });
  model.startTurn();
  assert.equal(model.getSnapshot().busy, true);

  for (const event of EVENTS.slice(0, 4)) model.render(event);
  let snapshot = model.getSnapshot();
  assert.equal(snapshot.activity, "run Read");
  assert.equal(snapshot.subagentActivity, "run Grep");

  model.render(EVENTS[4]);
  assert.equal(stripAnsi(model.getSnapshot().live), "Done.");

  model.render(EVENTS[5]);
  model.endTurn();
  snapshot = model.getSnapshot();
  assert.equal(snapshot.busy, false);
  assert.equal(snapshot.activity, null);
  assert.equal(snapshot.turns, 1);
  assert.deepEqual(snapshot.usage, { inputTokens: 1200, outputTokens: 80, costUsd: 0.01 });
});

test("notes reach the history but not the log", () => {
  let logged = "";
  const model = createSessionModel({ onWrite: (text) => (logged += text) });
  model.note("Checkpoint\nApproved");
  model.writeLine("logged");
  assert.deepEqual(model.getSnapshot().items.map((item) => item.text), ["Checkpoint", "Approved", "", "logged"]);
  assert.equal(logged, "logged\n");
});

test("with a width, a long reply streams into history rows and the live line stays short of the edge", async () => {
  const { default: stringWidth } = await import("string-width");
  const model = createSessionModel({ agentLabel: "Capitán Bigotes>", width: () => 40 });
  model.startTurn();
  const words = "¡Arrr, marinero! 🐱☠️ El Capitán Bigotes reporta a bordo, listo pa' zarpar hacia la misión que sea menester.".split(" ");
  for (const word of words) {
    model.render({ type: "text", text: `${word} ` });
    assert.ok(stringWidth(stripAnsi(model.getSnapshot().live)) <= 40);
  }
  assert.ok(model.getSnapshot().items.length >= 2);
  model.endTurn();
  const shown = model.getSnapshot().items.map((item) => stripAnsi(item.text)).join("");
  assert.equal(shown, `Capitán Bigotes> ${words.join(" ")} `);
});

test("liveWidth keeps a margin from the edge", () => {
  assert.equal(liveWidth(120), 116);
  assert.equal(liveWidth(undefined), 76);
  assert.equal(liveWidth(10), 6);
});

test("one blank line wherever the kind of output changes, none inside a run of the same kind", () => {
  let logged = "";
  const model = createSessionModel({ formatAction, onWrite: (text) => (logged += text) });
  model.note("you> hi", "user");
  model.startTurn();
  model.render({ type: "text", text: "Let me look.\n\n" });
  model.render({ type: "action", toolName: "Read", input: {} });
  model.render({ type: "action", toolName: "Grep", input: {} });
  model.render({ type: "text", text: "Found it.\n\nMore." });
  model.render({ type: "info", text: "note from the CLI", level: "info" });
  model.endTurn();

  assert.deepEqual(model.getSnapshot().items.map((item) => stripAnsi(item.text)), [
    "you> hi",
    "",
    "Let me look.",
    "",
    "[action] run Read",
    "[action] run Grep",
    "",
    "Found it.",
    "",
    "More.",
    "",
    "(note from the CLI)",
  ]);
  assert.doesNotMatch(logged, /you> hi/); // the human's line is logged by the chat loop, not here
  assert.match(stripAnsi(logged), /Let me look\.\n\n+\[action\]/); // the log keeps its own blank lines
});

test("a reply streaming after an action shows its blank line before the line completes", () => {
  const model = createSessionModel({ formatAction });
  model.startTurn();
  model.render({ type: "action", toolName: "Read", input: {} });
  model.render({ type: "text", text: "Half a sent" });

  let snapshot = model.getSnapshot();
  assert.equal(snapshot.liveGap, true);
  assert.equal(stripAnsi(snapshot.items.at(-1)!.text), "[action] run Read");

  model.render({ type: "text", text: "ence.\nNext" });
  snapshot = model.getSnapshot();
  assert.deepEqual(snapshot.items.map((item) => stripAnsi(item.text)), ["[action] run Read", "", "Half a sentence."]);
  assert.equal(snapshot.liveGap, false); // same kind as the line above it now
});

test("an unfinished reply line cut by an action keeps its own kind", () => {
  const model = createSessionModel({ formatAction });
  model.startTurn();
  model.render({ type: "text", text: "Checking" });
  model.render({ type: "action", toolName: "Read", input: {} });
  assert.deepEqual(model.getSnapshot().items.map((item) => stripAnsi(item.text)), ["Checking", "", "[action] run Read"]);
});

test("separate() adds one blank line between turns, never two and never at the top", () => {
  const model = createSessionModel();
  model.separate();
  assert.equal(model.getSnapshot().items.length, 0);
  model.note("you> hello");
  model.separate();
  model.separate();
  model.writeLine("reply");
  assert.deepEqual(model.getSnapshot().items.map((item) => item.text), ["you> hello", "", "reply"]);
});
