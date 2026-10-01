import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import type { PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { checkPlanScope, createPlanGate, type PlanScope } from "../../../src/core/hooks/planGate.js";

const projectDir = path.resolve("/workspace");
const planFile = path.join(projectDir, "drafts", "quiz", "plan.md");

const scope: PlanScope = {
  projectDir,
  isPlanFile: (filePath) => path.basename(filePath) === "plan.md" && path.dirname(path.dirname(filePath)) === path.join(projectDir, "drafts"),
  isReadOnlyTool: (toolName) => toolName === "mcp__browser__snapshot",
};

test("reading, searching, skills, subagents and asking a human go through", () => {
  for (const tool of ["Read", "Glob", "Grep", "WebFetch", "WebSearch", "Skill", "Agent", "mcp__approvals__request_human_approval", "mcp__manualLogin__request_manual_login"]) {
    assert.equal(checkPlanScope(scope, tool, {}), undefined, tool);
  }
});

test("Write/Edit go through only to a plan file, by absolute or project-relative path", () => {
  assert.equal(checkPlanScope(scope, "Write", { file_path: planFile }), undefined);
  assert.equal(checkPlanScope(scope, "Edit", { file_path: "drafts/quiz/plan.md" }), undefined);
  assert.match(checkPlanScope(scope, "Write", { file_path: "drafts/quiz/quiz.xml" }) ?? "", /isn't a plan file/);
  assert.ok(checkPlanScope(scope, "Edit", { file_path: "knowledge/notes.md" }));
  assert.ok(checkPlanScope(scope, "Write", {}));
});

test("without plan files, nothing can be written", () => {
  assert.match(checkPlanScope({ projectDir }, "Write", { file_path: planFile }) ?? "", /^Plan mode: nothing can be changed/);
});

test("Bash, saving to sources and MCP tools the agent doesn't vouch for are denied", () => {
  assert.ok(checkPlanScope(scope, "Bash", { command: "ls" }));
  assert.ok(checkPlanScope(scope, "mcp__sourceFiles__save_to_sources", {}));
  assert.ok(checkPlanScope(scope, "mcp__browser__click", {}));
  assert.equal(checkPlanScope(scope, "mcp__browser__snapshot", {}), undefined);
  assert.ok(checkPlanScope({ projectDir }, "mcp__browser__snapshot", {}));
});

test("the gate decides only while plan mode is on, and denies with the reason", async () => {
  let active = false;
  const gate = createPlanGate(scope, () => active);
  const input = { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "rm -rf x" } } as unknown as PreToolUseHookInput;
  const signal = new AbortController().signal;

  assert.deepEqual(await gate(input, undefined, { signal }), {});

  active = true;
  const decision = (await gate(input, undefined, { signal })) as { hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string } };
  assert.equal(decision.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(decision.hookSpecificOutput?.permissionDecisionReason ?? "", /Plan mode/);

  // Allowed calls get no decision, so the other gates (file scope...) still judge them.
  const read = { ...input, tool_name: "Read", tool_input: { file_path: "x.md" } } as unknown as PreToolUseHookInput;
  assert.deepEqual(await gate(read, undefined, { signal }), {});
});
