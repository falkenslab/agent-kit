import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { buildSessionOptions, createModeControl } from "../../src/core/session.js";
import { createStepGate } from "../../src/core/hooks/stepGate.js";
import { setInteractionPort } from "../../src/core/interaction.js";

afterEach(() => setInteractionPort(null));

test("guided and interactive switch into each other; autonomous stays put", () => {
  const guided = createModeControl("guided");
  assert.deepEqual(guided.switchable, ["guided", "interactive"]);
  assert.equal(guided.set("interactive"), true);
  assert.equal(guided.mode, "interactive");
  assert.equal(guided.set("autonomous"), false);
  assert.equal(guided.mode, "interactive");

  const autonomous = createModeControl("autonomous");
  assert.deepEqual(autonomous.switchable, ["autonomous"]);
  assert.equal(autonomous.set("guided"), false);
  assert.equal(autonomous.mode, "autonomous");
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
      knowledgeBase: false,
    };
    const guided = await buildSessionOptions({ mode: "guided", projectDir: runDir }, runDir, spec);
    assert.equal(guided.modeControl.mode, "guided");
    assert.equal(guided.modeControl.switchable.length, 2);
    const autonomous = await buildSessionOptions({ mode: "autonomous", projectDir: runDir }, runDir, spec);
    assert.equal(autonomous.modeControl.switchable.length, 1);
    // No step gate without the approval tool: one PreToolUse hook fewer than a guided session.
    assert.equal(guided.options.hooks!.PreToolUse!.length, autonomous.options.hooks!.PreToolUse!.length + 1);
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});
