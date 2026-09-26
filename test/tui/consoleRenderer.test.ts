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
  [text("Voy a leer"), text(" el fichero."), action("Read"), text("Hecho.")].forEach(renderer.render);
  assert.equal(out(), "Voy a leer el fichero.\n[action] Read\nHecho.");
});

test("the agent label is printed once per turn, on a line of its own", () => {
  const { renderer, text: out } = capture("agent>");
  [text("Hola."), action("Read"), text("Sigo.")].forEach(renderer.render);
  renderer.endLine();
  renderer.startTurn();
  renderer.render(text("Otro turno."));
  assert.equal(out(), "agent> Hola.\n[action] Read\nSigo.\nagent> Otro turno.");
});

test("notices and failures end the current line first, and endLine is a no-op at a line start", () => {
  const { renderer, text: out } = capture();
  renderer.render(text("a medias"));
  renderer.render({ type: "info", level: "info", text: "aviso" } as AgentEvent);
  renderer.endLine();
  renderer.render({ type: "turn-end", status: "error", failed: true, resultText: null, errorText: "falló" });
  assert.equal(out(), "a medias\n(aviso)\nfalló\n");
  assert.equal(renderer.atLineStart, true);
});

test("onWrite sees exactly what was written", () => {
  let mirrored = "";
  const renderer = createConsoleRenderer({ formatAction: (n) => n, output: () => {}, onWrite: (t) => (mirrored += t) });
  [text("x"), action("Read")].forEach(renderer.render);
  assert.equal(plain(mirrored), "x\n[action] Read\n");
});
