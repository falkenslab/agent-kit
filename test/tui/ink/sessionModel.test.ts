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
  assert.equal(model.getSnapshot().items.map((item) => stripAnsi(item.text)).join("\n") + "\n", stripAnsi(consoleText));
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
  assert.deepEqual(model.getSnapshot().items.map((item) => item.text), ["Checkpoint", "Approved", "logged"]);
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
  assert.equal(liveWidth(10), 20);
});
