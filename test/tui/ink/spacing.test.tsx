/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup } from "ink-testing-library";
import { Text } from "ink";
import { createSessionModel } from "../../../src/tui/ink/sessionModel.js";
import { createInkInteraction } from "../../../src/tui/ink/inkInteraction.js";
import { SessionView } from "../../../src/tui/ink/SessionView.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

afterEach(() => cleanup());

test("the blank lines between kinds of output reach the screen, one render at a time", async () => {
  const model = createSessionModel({ formatAction: (name) => `run ${name}`, agentLabel: "Capitán Bigotes>" });
  const interaction = createInkInteraction((text) => model.note(text));
  const view = render(<SessionView model={model} interaction={interaction} />);

  // The same steps, each flushed to the screen on its own, as runChatInk() does them.
  model.note("tú> hola", "user");
  await settle();
  model.separate();
  await settle();
  model.startTurn();
  model.render({ type: "text", text: "¡Arrr! Mando al minino." });
  await settle();
  model.render({ type: "action", toolName: "Agent", input: {} });
  await settle();
  model.render({ type: "action", toolName: "Agent", input: {} });
  await settle();
  model.endTurn();
  await settle();

  const screen = stripAnsi(view.lastFrame() ?? "");
  assert.match(screen, /tú> hola +\n\n● ¡Arrr! Mando al minino\.\n\n {2}Ran 2 subagents/);
});

test("the blank line above the prompt is there while typing, and Enter doesn't add another", async () => {
  const model = createSessionModel({ agentLabel: "Capitán Bigotes>" });
  const interaction = createInkInteraction((text) => model.note(text));
  const view = render(
    <SessionView model={model} interaction={interaction}>
      <Text>tú&gt; typing</Text>
    </SessionView>,
  );

  model.startTurn();
  model.render({ type: "text", text: "Arrr." });
  model.endTurn();
  await settle();
  model.separate(); // runChatInk(), before showing the prompt
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /● Arrr\.\n\n✻ Worked for \d+s\n\ntú> typing/);

  model.note("tú> otra", "user"); // Enter: the line moves to the history
  await settle();
  model.separate(); // runChatInk(), before the turn
  model.startTurn();
  model.render({ type: "text", text: "Voy.\n" });
  model.endTurn();
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /✻ Worked for \d+s\n\n tú> otra +\n\n● Voy\.\n/);
});
