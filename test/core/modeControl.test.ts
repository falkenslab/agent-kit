import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { buildSessionOptions, createInputQueue, createModeControl, togglePlanMode } from "../../src/core/session.js";
import { createStepGate } from "../../src/core/hooks/stepGate.js";
import { setInteractionPort } from "../../src/core/interaction.js";

afterEach(() => setInteractionPort(null));

test("guided, interactive and plan switch into one another; autonomous stays put", () => {
  const guided = createModeControl("guided");
  assert.deepEqual(guided.switchable, ["guided", "interactive", "plan"]);
  assert.equal(guided.set("interactive"), true);
  assert.equal(guided.mode, "interactive");
  assert.equal(guided.set("autonomous"), false);
  assert.equal(guided.mode, "interactive");

  assert.equal(guided.set("plan"), true);
  assert.equal(guided.mode, "plan");
  assert.deepEqual(createModeControl("plan").switchable, ["guided", "interactive", "plan"]);

  const autonomous = createModeControl("autonomous");
  assert.deepEqual(autonomous.switchable, ["autonomous"]);
  assert.equal(autonomous.set("guided"), false);
  assert.equal(autonomous.mode, "autonomous");
  assert.equal(autonomous.set("plan"), false);
});

test("the model is told once when plan mode starts or ends, and not about other switches", () => {
  const control = createModeControl("guided");
  assert.equal(control.takeNotice!(), undefined);
  control.set("interactive");
  assert.equal(control.takeNotice!(), undefined);
  control.set("plan");
  assert.match(control.takeNotice()!, /switched to plan mode/);
  assert.equal(control.takeNotice!(), undefined);
  control.set("guided");
  assert.match(control.takeNotice()!, /left plan mode/);
  assert.equal(control.takeNotice!(), undefined);

  // Into plan and back before the next message: nothing to tell.
  control.set("plan");
  control.set("guided");
  assert.equal(control.takeNotice!(), undefined);

  // A session that starts in plan mode says so with its first message.
  assert.match(createModeControl("plan").takeNotice()!, /switched to plan mode/);
});

test("/plan goes into plan mode and back to the mode it came from; autonomous can't", () => {
  const control = createModeControl("interactive");
  assert.equal(togglePlanMode(control), "plan");
  assert.equal(control.mode, "plan");
  assert.equal(togglePlanMode(control), "interactive");
  assert.equal(control.mode, "interactive");
  // Started in plan mode: back to guided.
  assert.equal(togglePlanMode(createModeControl("plan")), "guided");
  const autonomous = createModeControl("autonomous");
  assert.equal(togglePlanMode(autonomous), null);
  assert.equal(autonomous.mode, "autonomous");
});

test("the input queue puts the plan-mode note before the next message", async () => {
  const control = createModeControl("guided");
  const queue = createInputQueue({ modeControl: control });
  const messages = queue.iterable[Symbol.asyncIterator]();
  control.set("plan");
  queue.push("fix the bug");
  const first = (await messages.next()).value!;
  assert.match(first.message.content as string, /^<system-reminder>The user switched to plan mode[\s\S]*<\/system-reminder>\n\nfix the bug$/);
  queue.push("and the other one");
  assert.equal((await messages.next()).value!.message.content, "and the other one");
  queue.end();
});

test("the step gate asks only while active, and gives no decision otherwise", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    let asked = 0;
    setInteractionPort({
      askDecision: async () => {
        asked++;
        return "y";
      },
      askManualIntervention: async () => "",
      notify: () => {},
    });
    let active = false;
    const gate = createStepGate(runDir, () => active);
    const input = { hook_event_name: "PreToolUse", tool_name: "Read", tool_input: {} } as unknown as PreToolUseHookInput;
    const signal = new AbortController().signal;

    assert.deepEqual(await gate(input, undefined, { signal }), {});
    assert.equal(asked, 0);

    active = true;
    const decision = await gate(input, undefined, { signal });
    assert.equal(asked, 1);
    assert.equal((decision as { hookSpecificOutput?: { permissionDecision?: string } }).hookSpecificOutput?.permissionDecision, "allow");
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

test("buildSessionOptions returns the session's mode control", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    const spec = {
      buildSystemPrompt: () => "test",
      buildMcpServers: () => ({}),
      pluginRoots: () => [],
      buildSubagents: () => undefined,
    };
    const guided = await buildSessionOptions({ mode: "guided", projectDir: runDir }, runDir, spec);
    assert.equal(guided.modeControl.mode, "guided");
    assert.equal(guided.modeControl.switchable.length, 3);
    const autonomous = await buildSessionOptions({ mode: "autonomous", projectDir: runDir }, runDir, spec);
    assert.equal(autonomous.modeControl.switchable.length, 1);
    // No step gate or plan gate without the approval tool: two PreToolUse hooks fewer than a guided session.
    assert.equal(guided.options.hooks!.PreToolUse!.length, autonomous.options.hooks!.PreToolUse!.length + 2);
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});
