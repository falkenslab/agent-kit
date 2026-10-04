/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup } from "ink-testing-library";
import { Text } from "ink";
import { createSessionModel } from "../../../src/tui/ink/sessionModel.js";
import { createInkInteraction } from "../../../src/tui/ink/inkInteraction.js";
import { SessionView, previewLines, statusText } from "../../../src/tui/ink/SessionView.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";
import { PromptInput, completeCommand, matchingCommands, visibleWindow } from "../../../src/tui/ink/PromptInput.js";
import { Wizard, visibleOptions, type WizardAnswers, type WizardStep } from "../../../src/tui/ink/wizard.js";

const ENTER = "\r";
const UP = "\u001B[A";
const DOWN = "\u001B[B";
const TAB = "\t";

// Ink attaches its input listeners and repaints asynchronously.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

/**
 * Writes `key` until the frame matches `shows`: a panel that just appeared may not be
 * listening to the keyboard yet (its input handler is attached after it's drawn), so the
 * first key can be lost under load.
 */
async function pressUntil(view: { stdin: { write(data: string): void }; lastFrame(): string | undefined }, key: string, shows: RegExp): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    view.stdin.write(key);
    for (let waited = 0; waited < 400; waited += 10) {
      if (shows.test(stripAnsi(view.lastFrame() ?? ""))) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  assert.fail(`the frame never showed ${shows}`);
}

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
  assert.match(stripAnsi(frame), /● run Read\n {2}⎿ {2}…/); // the call, shown with its result pending
  assert.match(frame, /Half a sent/);
  assert.match(frame, /↳ run Grep/);
  assert.match(stripAnsi(frame), /⏵⏵ guided · 0 turns/);
  assert.match(stripAnsi(frame), /run Read \(\d+s · esc to interrupt\)/);
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
  assert.match(frame, /Do you want to proceed\?/);
  assert.match(frame, /1\. Yes/);
  assert.match(frame, /3\. Stop/);
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

test("statusText shows mode, turns and tokens, never the cost", () => {
  assert.equal(statusText(undefined, 1, null), "1 turn");
  assert.equal(statusText("autonomous", 3, { inputTokens: 12345, outputTokens: 678, costUsd: 0.04567 }), "⏵⏵ autonomous · 3 turns · 12.3k in / 678 out");
});

test("command completion", () => {
  const commands = ["compact", "captain-whiskers:joke", "clear", "exit"];
  assert.deepEqual(matchingCommands("/c", commands), ["compact", "captain-whiskers:joke", "clear"]);
  assert.deepEqual(matchingCommands("/compact now", commands), []);
  assert.deepEqual(matchingCommands("hello", commands), []);
  assert.equal(completeCommand("/cap", commands), "/captain-whiskers:joke ");
  assert.equal(completeCommand("/co", ["compact", "config"]), "/co");
  assert.equal(completeCommand("/c", ["compact", "compare"]), "/compa");
  assert.equal(completeCommand("/zzz", commands), "/zzz");
});

test("the prompt edits, walks the history with ↑/↓, completes with Tab and submits with Enter", async () => {
  const submitted: string[] = [];
  const view = render(
    <PromptInput label="you> " history={["first", "second"]} commands={["compact", "captain-whiskers:joke"]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />,
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
  assert.match(view.lastFrame() ?? "", /\/captain-whiskers:joke/);
  view.stdin.write(TAB);
  await settle();
  view.stdin.write("x");
  await settle();
  view.stdin.write(ENTER);
  await settle();

  assert.deepEqual(submitted, ["draft", "/captain-whiskers:joke x"]);
});

test("the wizard's last answer is written as a ✔ line before it exits", async () => {
  let result: WizardAnswers | null | undefined;
  const steps: WizardStep[] = [{ type: "confirm", name: "create", message: "Create instructions.md?", default: false }];
  const view = render(<Wizard steps={steps} onDone={(answers) => (result = answers)} />);
  await settle();
  view.stdin.write(ENTER);
  await settle();
  assert.deepEqual(result, { create: false });
  // Written to <Static>: in the output, not only in the state.
  assert.match(stripAnsi(view.frames.join("\n")), /✔ Create instructions\.md\? No/);
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

test("a long prompt line scrolls sideways around the cursor", () => {
  assert.deepEqual(visibleWindow(10, 10, 40), [0, 10]);
  const [start, end] = visibleWindow(100, 100, 40);
  assert.equal(end, 100);
  assert.ok(end - start <= 38);
  const [s2, e2] = visibleWindow(100, 5, 40);
  assert.equal(s2, 0);
  assert.ok(e2 - s2 <= 38 && e2 > 5);
});

test("a huge approval preview is capped below the terminal's height", () => {
  const lines = previewLines(["Tool: Write", `Parameters: ${"x\n".repeat(200)}`], 30);
  assert.equal(lines.length, 18);
  assert.match(lines.at(-1) ?? "", /more lines/);
  assert.deepEqual(previewLines(["a", "b"], 30), ["a", "b"]);
});

test("a select shows only the choices that fit in the terminal's height", () => {
  assert.equal(visibleOptions(7, 1, 40), 7);
  assert.equal(visibleOptions(7, 2, 10), 5);
  assert.equal(visibleOptions(7, 20, 10), 1);
});

test("the agent's task list shows above the prompt, not in the history, and goes away when it's all done", async () => {
  const { model, interaction } = setup();
  const view = render(
    <SessionView model={model} interaction={interaction}>
      <Text>PROMPT</Text>
    </SessionView>,
  );
  const todos = (...statuses: string[]) => ({
    type: "action" as const,
    toolName: "TodoWrite",
    input: { todos: statuses.map((status, i) => ({ content: `Task ${i + 1}`, status, activeForm: `Doing task ${i + 1}` })) },
  });
  model.startTurn();
  model.render(todos("completed", "in_progress", "pending"));
  model.render({ type: "tool-result", toolUseId: "x", toolName: "TodoWrite", isError: false, text: "Todos have been modified successfully." });
  await settle();
  const frame = stripAnsi(view.lastFrame() ?? "");
  assert.match(frame, /⎿ ☑ Task 1\n\s+◼ Task 2\n\s+☐ Task 3\n[\s\S]*PROMPT/);
  assert.match(frame, /Doing task 2 \(\d+s · esc to interrupt\)/); // the spinner says what's in progress
  assert.doesNotMatch(frame, /run TodoWrite/);
  assert.equal(model.getSnapshot().items.length, 0);

  model.render(todos("completed", "completed", "completed"));
  await settle();
  assert.doesNotMatch(stripAnsi(view.lastFrame() ?? ""), /Task 1/);
});

test("a text checkpoint takes typed text with Enter, or no answer with Esc", async () => {
  const { model, interaction } = setup();
  const view = render(<SessionView model={model} interaction={interaction} />);
  const answer = interaction.port.askText!({ title: "The agent asks for a file", lines: ["The course syllabus"], question: "Path:" }, new AbortController().signal);
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /The agent asks for a file[\s\S]*The course syllabus[\s\S]*Path:/);
  view.stdin.write("C:/Docs/My Syllabus.PDF");
  await settle();
  view.stdin.write(ENTER);
  assert.equal(await answer, "C:/Docs/My Syllabus.PDF");
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /✔ C:\/Docs\/My Syllabus\.PDF/);

  const none = interaction.port.askText!({ title: "Again", lines: [] }, new AbortController().signal);
  await settle();
  view.stdin.write("\u001B");
  assert.equal(await none, "");
});

test("a choice panel: pick one with Enter, or type your own answer under Other", async () => {
  const { model, interaction } = setup();
  const view = render(<SessionView model={model} interaction={interaction} />);
  const signal = new AbortController().signal;
  const choice = { options: ["One session", "Two sessions"], multiple: false };
  const first = interaction.port.askChoice!({ title: "The agent asks", lines: ["How long is topic 3?"] }, choice, signal);
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /How long is topic 3\?[\s\S]*1\. One session[\s\S]*2\. Two sessions[\s\S]*Other/);
  await pressUntil(view, DOWN, /❯ 2\. Two sessions/);
  await settle();
  view.stdin.write(ENTER);
  assert.equal(await first, "2");
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /✔ Two sessions/);

  const second = interaction.port.askChoice!({ title: "The agent asks", lines: ["Again?"] }, choice, signal);
  await settle();
  await pressUntil(view, DOWN, /❯ 2\. Two sessions/);
  await pressUntil(view, DOWN, /❯ Other/);
  await pressUntil(view, ENTER, /type the answer/); // Other: a text field
  await pressUntil(view, "T", /> T/); // the field is listening
  await pressUntil(view, "hree, with a lab", /> Three, with a lab/);
  await settle();
  view.stdin.write(ENTER);
  assert.equal(await second, "Three, with a lab");
});

test("a multiple choice panel marks with Space and sends with Enter", async () => {
  const { model, interaction } = setup();
  const view = render(<SessionView model={model} interaction={interaction} />);
  const answer = interaction.port.askChoice!({ title: "The agent asks", lines: ["Which topics?"] }, { options: ["Knots", "Sails", "Tides"], multiple: true }, new AbortController().signal);
  await settle();
  // Each key once the frame shows the one before took effect: ❯ is the focus, ✔ a mark.
  await pressUntil(view, " ", /1\. Knots ✔/);
  await pressUntil(view, DOWN, /❯ 2\. Sails/);
  await pressUntil(view, DOWN, /❯ 3\. Tides/);
  await pressUntil(view, " ", /3\. Tides ✔/);
  // The list's key handler is renewed just after the frame: an Enter at once would still see
  // the marks before the last one (no person is that fast).
  await settle();
  view.stdin.write(ENTER);
  assert.equal(await answer, "1,3");
});

test("a plan in a checkpoint is drawn as markdown", async () => {
  const { model, interaction } = setup();
  const view = render(<SessionView model={model} interaction={interaction} />);
  void interaction.port.askChoice!({ title: "The plan", lines: ["## Steps", "", "1. **Read** the syllabus"], markdown: true }, { options: ["Run it", "Keep planning"], multiple: false }, new AbortController().signal);
  await settle();
  const frame = stripAnsi(view.lastFrame() ?? "");
  assert.match(frame, /Steps/);
  assert.match(frame, /1\. Read the syllabus/);
  assert.doesNotMatch(frame, /\*\*Read\*\*/);
});
