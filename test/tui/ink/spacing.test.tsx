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
  const model = createSessionModel({ formatAction: (name) => `run ${name}`, agentLabel: "Captain Whiskers>" });
  const interaction = createInkInteraction((text) => model.note(text));
  const view = render(<SessionView model={model} interaction={interaction} />);

  // The same steps, each flushed to the screen on its own, as runChatInk() does them.
  model.note("you> hello", "user");
  await settle();
  model.separate();
  await settle();
  model.startTurn();
  model.render({ type: "text", text: "Arrr! Sending the kitty." });
  await settle();
  model.render({ type: "action", toolName: "Agent", input: {} });
  await settle();
  model.render({ type: "action", toolName: "Agent", input: {} });
  await settle();
  model.endTurn();
  await settle();

  const screen = stripAnsi(view.lastFrame() ?? "");
  assert.match(screen, /you> hello +\n\n● Arrr! Sending the kitty\.\n\n● run Agent\n {2}⎿ {2}…\n● run Agent/);
});

test("the blank line above the prompt is there while typing, and Enter doesn't add another", async () => {
  const model = createSessionModel({ agentLabel: "Captain Whiskers>" });
  const interaction = createInkInteraction((text) => model.note(text));
  const view = render(
    <SessionView model={model} interaction={interaction}>
      <Text>you&gt; typing</Text>
    </SessionView>,
  );

  model.startTurn();
  model.render({ type: "text", text: "Arrr." });
  model.endTurn();
  await settle();
  model.separate(); // runChatInk(), before showing the prompt
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /● Arrr\.\n\n✻ Worked for \d+s\n\nyou> typing/);

  model.note("you> another", "user"); // Enter: the line moves to the history
  await settle();
  model.separate(); // runChatInk(), before the turn
  model.startTurn();
  model.render({ type: "text", text: "On it.\n" });
  model.endTurn();
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /✻ Worked for \d+s\n\n you> another +\n\n● On it\.\n/);
});
