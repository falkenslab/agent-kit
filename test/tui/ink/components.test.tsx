/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup } from "ink-testing-library";
import { Text } from "ink";
import { createSessionModel } from "../../../src/tui/ink/sessionModel.js";
import { createInkInteraction } from "../../../src/tui/ink/inkInteraction.js";
import { SessionView, statusText } from "../../../src/tui/ink/SessionView.js";
import { PromptInput, completeCommand, matchingCommands } from "../../../src/tui/ink/PromptInput.js";
import { Wizard, type WizardAnswers, type WizardStep } from "../../../src/tui/ink/wizard.js";

const ENTER = "\r";
const UP = "\u001B[A";
const DOWN = "\u001B[B";
const TAB = "\t";

// Ink attaches its input listeners and repaints asynchronously.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

afterEach(() => cleanup());

function setup() {
  const model = createSessionModel({ formatAction: (name) => `run ${name}` });
  const interaction = createInkInteraction((text) => model.note(text));
  return { model, interaction };
}

test("the session view shows history, the reply in progress, the current action and the status", async () => {
  const { model, interaction } = setup();
  const view = render(<SessionView model={model} interaction={interaction} mode="guided" />);
  model.writeLine("Welcome aboard");
  model.startTurn();
  model.render({ type: "action", toolName: "Read", input: {} });
  model.render({ type: "subagent-action", toolName: "Grep", input: {} });
  model.render({ type: "text", text: "Half a sent" });
  await settle();

  const frame = view.lastFrame() ?? "";
  assert.match(frame, /Welcome aboard/);
  assert.match(frame, /\[action\] run Read/);
  assert.match(frame, /Half a sent/);
  assert.match(frame, /↳ run Grep/);
  assert.match(frame, /guided · 0 turns/);
});

test("the approval panel answers with y, n or q, and returns to the session", async () => {
  const { model, interaction } = setup();
  const view = render(
    <SessionView model={model} interaction={interaction}>
      <Text>PROMPT</Text>
    </SessionView>,
  );
  const answer = interaction.port.askDecision({ title: "Publish the post", lines: ["Summary: hello"] }, new AbortController().signal);
  await settle();

  let frame = view.lastFrame() ?? "";
  assert.match(frame, /Publish the post/);
  assert.match(frame, /Summary: hello/);
  assert.match(frame, /Approve/);
  assert.doesNotMatch(frame, /PROMPT/); // the input is hidden while a checkpoint waits

  view.stdin.write("n");
  assert.equal(await answer, "n");
  await settle();
  frame = view.lastFrame() ?? "";
  assert.match(frame, /PROMPT/);
  assert.match(frame, /Rejected/);
});

test("the approval panel's Select approves with Enter, and a consumer can replace the preview", async () => {
  const { model, interaction } = setup();
  const view = render(
    <SessionView model={model} interaction={interaction} renderApproval={(prompt) => <Text>{`Custom: ${prompt.title}`}</Text>} />,
  );
  const answer = interaction.port.askDecision({ title: "Deploy", lines: ["hidden line"] }, new AbortController().signal);
  await settle();

  const frame = view.lastFrame() ?? "";
  assert.match(frame, /Custom: Deploy/);
  assert.doesNotMatch(frame, /hidden line/);
  view.stdin.write(ENTER);
  assert.equal(await answer, "y");
});

test("a manual-intervention panel continues with Enter", async () => {
  const { model, interaction } = setup();
  const view = render(<SessionView model={model} interaction={interaction} />);
  const answer = interaction.port.askManualIntervention(
    { title: "Log in by hand", lines: [], question: "Press Enter once logged in" },
    new AbortController().signal,
  );
  await settle();
  assert.match(view.lastFrame() ?? "", /Press Enter once logged in/);
  view.stdin.write(ENTER);
  assert.equal(await answer, "");
});

test("statusText shows mode, turns, tokens and cost", () => {
  assert.equal(statusText(undefined, 1, null), "1 turn");
  assert.equal(statusText("autonomous", 3, { inputTokens: 12345, outputTokens: 678, costUsd: 0.04567 }), "autonomous · 3 turns · 12.3k in / 678 out · $0.0457");
});

test("command completion", () => {
  const commands = ["compact", "captain-whiskers:chiste", "clear", "exit"];
  assert.deepEqual(matchingCommands("/c", commands), ["compact", "captain-whiskers:chiste", "clear"]);
  assert.deepEqual(matchingCommands("/compact now", commands), []);
  assert.deepEqual(matchingCommands("hello", commands), []);
  assert.equal(completeCommand("/cap", commands), "/captain-whiskers:chiste ");
  assert.equal(completeCommand("/co", ["compact", "config"]), "/co");
  assert.equal(completeCommand("/c", ["compact", "compare"]), "/compa");
  assert.equal(completeCommand("/zzz", commands), "/zzz");
});

test("the prompt edits, walks the history with ↑/↓, completes with Tab and submits with Enter", async () => {
  const submitted: string[] = [];
  const view = render(
    <PromptInput label="you> " history={["first", "second"]} commands={["compact", "captain-whiskers:chiste"]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />,
  );
  await settle();

  view.stdin.write("draft");
  await settle();
  view.stdin.write(UP);
  await settle();
  assert.match(view.lastFrame() ?? "", /you> second/);
  view.stdin.write(UP);
  await settle();
  assert.match(view.lastFrame() ?? "", /you> first/);
  view.stdin.write(DOWN);
  await settle();
  view.stdin.write(DOWN);
  await settle();
  assert.match(view.lastFrame() ?? "", /you> draft/);
  view.stdin.write(ENTER);
  await settle();

  view.stdin.write("/cap");
  await settle();
  assert.match(view.lastFrame() ?? "", /\/captain-whiskers:chiste/);
  view.stdin.write(TAB);
  await settle();
  view.stdin.write("x");
  await settle();
  view.stdin.write(ENTER);
  await settle();

  assert.deepEqual(submitted, ["draft", "/captain-whiskers:chiste x"]);
});

test("the wizard skips steps with `when`, uses earlier answers and returns every answer", async () => {
  let result: WizardAnswers | null | undefined;
  const steps: WizardStep[] = [
    { type: "input", name: "user", message: "User:" },
    { type: "password", name: "pass", message: "Password:", when: (a) => a.user !== "" },
    {
      type: "select",
      name: "tone",
      message: (a) => `Tone for ${String(a.user)}:`,
      choices: [
        { name: "Neutral", value: undefined },
        { name: "Formal", value: "formal" },
      ],
    },
    { type: "confirm", name: "extras", message: "Enable extras?", default: false },
  ];
  const view = render(<Wizard steps={steps} onDone={(answers) => (result = answers)} />);
  await settle();

  view.stdin.write("ana");
  await settle();
  view.stdin.write(ENTER);
  await settle();
  assert.match(view.lastFrame() ?? "", /Password:/);
  view.stdin.write("s3cret");
  await settle();
  view.stdin.write(ENTER);
  await settle();
  assert.match(view.lastFrame() ?? "", /Tone for ana:/);
  assert.match(view.lastFrame() ?? "", /\*{6}/);
  view.stdin.write(DOWN);
  await settle();
  view.stdin.write(ENTER);
  await settle();
  view.stdin.write(ENTER); // confirm's default (No)
  await settle();

  assert.deepEqual(result, { user: "ana", pass: "s3cret", tone: "formal", extras: false });
});

test("a wizard step's validation keeps the step until the answer is valid, and Ctrl+C cancels", async () => {
  let result: WizardAnswers | null | undefined;
  const steps: WizardStep[] = [{ type: "input", name: "url", message: "URL:", validate: (v) => v.trim() !== "" || "Required" }];
  const view = render(<Wizard steps={steps} onDone={(answers) => (result = answers)} />);
  await settle();

  view.stdin.write(ENTER);
  await settle();
  assert.match(view.lastFrame() ?? "", /Required/);
  assert.equal(result, undefined);

  view.stdin.write("\u0003");
  await settle();
  assert.equal(result, null);
});
