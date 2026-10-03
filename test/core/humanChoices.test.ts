import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { askForChoice, parseChoice } from "../../src/core/hooks/humanInput.js";
import { setInteractionPort, type ApprovalPrompt, type InteractionPort } from "../../src/core/interaction.js";
import { createModeControl, togglePlanMode } from "../../src/core/modeControl.js";
import { createStepGate } from "../../src/core/hooks/stepGate.js";
import { checkPlanScope } from "../../src/core/hooks/planGate.js";
import type { PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

afterEach(() => setInteractionPort(null));

const port = (overrides: Partial<InteractionPort>): InteractionPort => ({
  askDecision: async () => "",
  askManualIntervention: async () => "",
  notify: () => {},
  ...overrides,
});

test("a raw choice answer: numbers on the first line, the person's own words after or alone", () => {
  const options = ["Red", "Green", "Blue"];
  assert.deepEqual(parseChoice("2", options, false), { chosen: ["Green"] });
  assert.deepEqual(parseChoice("1, 3", options, true), { chosen: ["Red", "Blue"] });
  assert.deepEqual(parseChoice("1,3", options, false), { chosen: ["Red"] }); // one only
  assert.deepEqual(parseChoice("9", options, false), { chosen: [] }); // out of range
  assert.deepEqual(parseChoice("Purple, please", options, false), { chosen: [], other: "Purple, please" });
  assert.deepEqual(parseChoice("1,2\nand a bit of blue", options, true), { chosen: ["Red", "Green"], other: "and a bit of blue" });
  assert.deepEqual(parseChoice("", options, false), { chosen: [] });
});

test("askForChoice goes through askChoice, or through askDecision with the options numbered", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    let settings: unknown;
    setInteractionPort(port({ askChoice: async (_prompt, choice) => ((settings = choice), "2") }));
    assert.deepEqual(await askForChoice(runDir, { title: "Q", lines: ["Which?"] }, ["A", "B"], true), { chosen: ["B"] });
    assert.deepEqual(settings, { options: ["A", "B"], multiple: true });

    let asked: ApprovalPrompt | undefined;
    setInteractionPort(port({ askDecision: async (prompt) => ((asked = prompt), "My Own Answer") }));
    assert.deepEqual(await askForChoice(runDir, { title: "Q", lines: ["Which?"] }, ["A", "B"]), { chosen: [], other: "My Own Answer" });
    assert.deepEqual(asked?.lines, ["Which?", "1. A", "2. B"]);
    assert.match(asked?.question ?? "", /Number/);

    // The response file answers the same way.
    setInteractionPort(null);
    const answer = askForChoice(runDir, { title: "Q", lines: [] }, ["A", "B"]);
    // After askForChoice clears any old response file.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await writeFile(path.join(runDir, "approval-response.txt"), "1");
    assert.deepEqual(await answer, { chosen: ["A"] });
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

test("a mode control tells its listeners when the mode changes, not when it stays", () => {
  const control = createModeControl("guided");
  const seen: string[] = [];
  const unsubscribe = control.subscribe!((mode) => seen.push(mode));
  togglePlanMode(control);
  control.set("plan"); // no change
  togglePlanMode(control);
  unsubscribe();
  control.set("interactive");
  assert.deepEqual(seen, ["plan", "guided"]);
});

test("the step gate doesn't ask before a tool that asks the person itself", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    let asked = 0;
    setInteractionPort(port({ askDecision: async () => (asked++, "y") }));
    const gate = createStepGate(runDir, () => true);
    const call = (tool_name: string) => gate({ hook_event_name: "PreToolUse", tool_name, tool_input: {} } as unknown as PreToolUseHookInput, undefined, { signal: new AbortController().signal });
    for (const tool of ["mcp__approvals__ask_human", "mcp__approvals__present_plan", "mcp__sourceFiles__request_file", "TodoWrite"]) assert.deepEqual(await call(tool), {}, tool);
    assert.equal(asked, 0);
    await call("WebSearch");
    assert.equal(asked, 1);
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

test("plan mode lets ask_human and present_plan through", () => {
  assert.equal(checkPlanScope({ projectDir: "/p" }, "mcp__approvals__ask_human", {}), undefined);
  assert.equal(checkPlanScope({ projectDir: "/p" }, "mcp__approvals__present_plan", {}), undefined);
});
