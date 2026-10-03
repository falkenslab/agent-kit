import path from "node:path";
import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

/** What plan mode lets through besides reading: see createPlanGate(). */
export interface PlanScope {
  /** Base for relative paths: the session's cwd. */
  projectDir: string;
  /** Whether Write/Edit may touch this file (absolute) in plan mode. */
  isPlanFile?(filePath: string): boolean;
  /** Whether one of the agent's own MCP tools only reads. */
  isReadOnlyTool?(toolName: string, input: Record<string, unknown>): boolean;
}

/** Built-in tools that only read, search, load a skill, delegate or keep the task list (a subagent's own calls come through this gate too). */
const READING_TOOLS = new Set(["Read", "Glob", "Grep", "WebFetch", "WebSearch", "Skill", "Agent", "TodoWrite"]);

/** The kit's own MCP servers whose tools only ask a human (approvals, manual intervention) or only read (the date and time). */
const ASKING_SERVERS = ["mcp__approvals__", "mcp__manualLogin__", "mcp__time__"];

/** The kit's own MCP tools that only read, on servers that also have tools that write. */
const READING_KIT_TOOLS = new Set(["mcp__sourceFiles__list_sources"]);

/** Why a call is denied in plan mode, and what the model should do instead. */
const denial =
  "Plan mode: nothing can be changed until the user leaves plan mode. Keep reading and researching, then present the plan; the user switches out of plan mode when they want it carried out.";

/**
 * The reason to deny `toolName` with `input` in plan mode, or `undefined` to let it through.
 * Anything not known to only read is denied, so a tool nobody thought of can't change
 * anything while the human reviews the plan.
 */
export function checkPlanScope(scope: PlanScope, toolName: string, input: Record<string, unknown>): string | undefined {
  if (READING_TOOLS.has(toolName)) return undefined;
  if (ASKING_SERVERS.some((prefix) => toolName.startsWith(prefix)) || READING_KIT_TOOLS.has(toolName)) return undefined;
  if (toolName === "Write" || toolName === "Edit") {
    const target = typeof input.file_path === "string" && input.file_path !== "" ? path.resolve(scope.projectDir, input.file_path) : undefined;
    if (target && scope.isPlanFile?.(target)) return undefined;
    return scope.isPlanFile
      ? `Plan mode: "${String(input.file_path)}" isn't a plan file, and nothing else can be written until the user leaves plan mode. Write the plan to its plan file.`
      : denial;
  }
  if (toolName.startsWith("mcp__") && scope.isReadOnlyTool?.(toolName, input)) return undefined;
  return denial;
}

/**
 * PreToolUse hook for "plan" mode: the agent only reads and plans (see checkPlanScope()).
 * Registered for every session that can be in plan mode and deciding only while `isActive()`
 * says it is; otherwise it gives no decision, so the call goes on as if it weren't there.
 * It's the kit's own gate, not the SDK's `permissionMode: "plan"` (ADR-023).
 */
export function createPlanGate(scope: PlanScope, isActive: () => boolean): HookCallback {
  return async (input) => {
    if (!isActive()) return {};
    const pre = input as PreToolUseHookInput;
    const reason = checkPlanScope(scope, pre.tool_name, (pre.tool_input ?? {}) as Record<string, unknown>);
    if (!reason) return {};
    return {
      hookSpecificOutput: {
        hookEventName: pre.hook_event_name,
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
  };
}
