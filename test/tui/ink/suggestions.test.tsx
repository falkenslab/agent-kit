/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup } from "ink-testing-library";
import { createSessionModel } from "../../../src/tui/ink/sessionModel.js";
import { createInkInteraction } from "../../../src/tui/ink/inkInteraction.js";
import { SessionView } from "../../../src/tui/ink/SessionView.js";
import { PromptInput } from "../../../src/tui/ink/PromptInput.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
const lines = (view: { lastFrame(): string | undefined }) => stripAnsi(view.lastFrame() ?? "").split("\n");

afterEach(() => cleanup());

/** The row right above the spinner's. */
function aboveSpinner(rows: string[]): string {
  const at = rows.findIndex((row) => row.includes("Thinking") || row.includes("run "));
  assert.ok(at > 0, rows.join("\n"));
  return rows[at - 1];
}

test("there is always one blank line between the spinner and the text above it", async () => {
  // A separator pending (a new turn), nothing streamed yet.
  let model = createSessionModel({ formatAction: (name) => `run ${name}` });
  let view = render(<SessionView model={model} interaction={createInkInteraction(() => {})} />);
  model.note("you> hi", "user");
  model.separate();
  model.startTurn();
  await settle();
  let rows = lines(view);
  assert.equal(aboveSpinner(rows).trim(), "");
  assert.equal(rows[rows.findIndex((row) => row.includes("Thinking")) - 2], "you> hi"); // one blank, not two
  cleanup();

  // A reply in progress above the spinner.
  model = createSessionModel();
  view = render(<SessionView model={model} interaction={createInkInteraction(() => {})} />);
  model.startTurn();
  model.render({ type: "text", text: "Half a sent" });
  await settle();
  assert.equal(aboveSpinner(lines(view)).trim(), "");
  cleanup();

  // Right after an action line (the spinner shows the action).
  model = createSessionModel({ formatAction: (name) => `run ${name}` });
  view = render(<SessionView model={model} interaction={createInkInteraction(() => {})} />);
  model.startTurn();
  model.render({ type: "action", toolName: "Read", input: {} });
  await settle();
  rows = lines(view);
  const spinnerAt = rows.findIndex((row) => /run Read/.test(row) && !row.includes("[action]"));
  assert.equal(rows[spinnerAt - 1].trim(), "");
});

test("the empty prompt shows the suggestion and Tab takes it", async () => {
  const submitted: string[] = [];
  const view = render(
    <PromptInput label="> " suggestion="cuéntame otro" history={[]} commands={["compact"]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />,
  );
  await settle();
  assert.match(lines(view)[0], /cuéntame otro {2}\(tab\)/);
  view.stdin.write("\t");
  await settle();
  view.stdin.write("\r");
  await settle();
  assert.deepEqual(submitted, ["cuéntame otro"]);
});

test("once something is typed the suggestion hides and Tab completes a command instead", async () => {
  const submitted: string[] = [];
  const view = render(
    <PromptInput label="> " suggestion="cuéntame otro" history={[]} commands={["compact"]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />,
  );
  await settle();
  view.stdin.write("/com");
  await settle();
  assert.doesNotMatch(lines(view)[0], /cuéntame otro/);
  view.stdin.write("\t");
  await settle();
  view.stdin.write("\r");
  await settle();
  assert.deepEqual(submitted, ["/compact "]);
});
