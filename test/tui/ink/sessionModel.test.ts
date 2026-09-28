import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentEvent } from "../../../src/core/runner.js";
import { createConsoleRenderer } from "../../../src/tui/consoleRenderer.js";
import { createSessionModel, liveWidth } from "../../../src/tui/ink/sessionModel.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const formatAction = (toolName: string) => `run ${toolName}`;
const screen = (model: ReturnType<typeof createSessionModel>) => model.getSnapshot().items.map((item) => stripAnsi(item.text));

const EVENTS: AgentEvent[] = [
  { type: "text", text: "Looking" },
  { type: "text", text: " around." },
  { type: "action", toolName: "Read", input: {}, toolUseId: "t1" },
  { type: "tool-result", toolUseId: "t1", toolName: "Read", isError: false, text: "a\nb\nc" },
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

test("the log is exactly what the console renderer prints; the screen shows Claude Code-like blocks", () => {
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
  const lines = screen(model);
  assert.deepEqual(lines.slice(0, -1), ["● Looking around.", "", "  Read 1 file", "", "● Done.", ""]);
  assert.match(lines.at(-1) ?? "", /^✻ Worked for \d+s$/);
});

test("tracks the current action, the subagent's, the turn's start and the session usage", () => {
  const model = createSessionModel({ formatAction });
  model.startTurn();
  let snapshot = model.getSnapshot();
  assert.equal(snapshot.busy, true);
  assert.ok(snapshot.turnStartedAt !== null);

  for (const event of EVENTS.slice(0, 5)) model.render(event);
  snapshot = model.getSnapshot();
  assert.equal(snapshot.activity, "run Read");
  assert.equal(snapshot.subagentActivity, "run Grep");

  model.render(EVENTS[6]);
  model.endTurn();
  snapshot = model.getSnapshot();
  assert.equal(snapshot.busy, false);
  assert.equal(snapshot.activity, null);
  assert.equal(snapshot.turns, 1);
  assert.deepEqual(snapshot.usage, { inputTokens: 1200, outputTokens: 80, costUsd: 0.01 });
});

test("markdown renders as it streams: finished blocks go to the history, the growing one stays live", () => {
  const model = createSessionModel();
  model.startTurn();
  model.render({ type: "text", text: "Primero un **párrafo**.\n\n- uno\n" });
  assert.deepEqual(screen(model), ["● Primero un párrafo."]);
  assert.equal(stripAnsi(model.getSnapshot().live), "  - uno");

  model.render({ type: "text", text: "- dos con `código`\n\nFin." });
  assert.deepEqual(screen(model), ["● Primero un párrafo.", "", "  - uno", "  - dos con código"]);
  model.endTurn();
  const lines = screen(model);
  assert.deepEqual(lines.slice(4, 6), ["", "  Fin."]);
  assert.ok(lines.every((line) => !line.includes("**") && !line.includes("`")), "no raw markdown left");
});

test("a long reply keeps only a few rows live, and no text is lost", () => {
  const model = createSessionModel({ width: () => 30 });
  model.startTurn();
  const words = Array.from({ length: 80 }, (_, i) => `palabra${i}`);
  for (const word of words) {
    model.render({ type: "text", text: `${word} ` });
    assert.ok(model.getSnapshot().live.split("\n").length <= 6);
  }
  model.endTurn();
  const text = screen(model)
    .filter((line) => !line.startsWith("✻"))
    .map((line) => line.replace(/^[● ] /, "").trim())
    .join(" ");
  assert.equal(text.replace(/\s+/g, " ").trim(), words.join(" "));
});

test("tool calls show one by one with their results (and a subagent's calls); Ctrl+O folds them into one line", () => {
  const model = createSessionModel({ formatAction });
  model.startTurn();
  model.render({ type: "action", toolName: "Read", input: {}, toolUseId: "a" });
  model.render({ type: "action", toolName: "Read", input: {}, toolUseId: "b" });
  model.render({ type: "action", toolName: "Bash", input: {}, toolUseId: "c" });
  model.render({ type: "action", toolName: "Agent", input: {}, toolUseId: "d" });
  model.render({ type: "subagent-action", toolName: "WebSearch", input: {}, parentToolUseId: "d" });
  model.render({ type: "tool-result", toolUseId: "a", toolName: "Read", isError: false, text: "one\ntwo" });
  model.render({ type: "tool-result", toolUseId: "c", toolName: "Bash", isError: true, text: "command not found" });
  model.render({ type: "tool-result", toolUseId: "d", toolName: "Agent", isError: false, text: "Three jokes found" });
  assert.deepEqual(stripAnsi(model.getSnapshot().live).split("\n"), [
    "● run Read",
    "  ⎿  one (+1 line)",
    "● run Read",
    "  ⎿  …",
    "● run Bash",
    "  ⎿  command not found",
    "● run Agent",
    "  ⎿  · run WebSearch",
    "     Three jokes found",
  ]);

  model.toggleExpanded();
  assert.equal(stripAnsi(model.getSnapshot().live), "  Read 2 files, ran 1 shell command, ran 1 subagent");
  model.toggleExpanded();

  model.render({ type: "text", text: "Hecho." });
  const group = model.getSnapshot().items.find((item) => item.kind === "action");
  assert.equal(stripAnsi(group?.text ?? ""), "  Read 2 files, ran 1 shell command, ran 1 subagent");
  assert.equal(group?.expanded?.length, 9);
});

test("notes reach the history but not the log; writeLine reaches both", () => {
  let logged = "";
  const model = createSessionModel({ onWrite: (text) => (logged += text) });
  model.note("Checkpoint\nApproved");
  model.writeLine("logged");
  assert.deepEqual(screen(model), ["Checkpoint", "Approved", "", "logged"]);
  assert.equal(logged, "logged\n");
});

test("separate() adds one blank line between turns, never two and never at the top", () => {
  const model = createSessionModel();
  model.separate();
  assert.equal(model.getSnapshot().items.length, 0);
  model.note("you> hello", "user");
  model.separate();
  model.separate();
  model.writeLine("reply");
  assert.deepEqual(screen(model), ["you> hello", "", "reply"]);
});

test("liveWidth keeps a margin from the edge", () => {
  assert.equal(liveWidth(120), 116);
  assert.equal(liveWidth(undefined), 76);
  assert.equal(liveWidth(10), 6);
});
