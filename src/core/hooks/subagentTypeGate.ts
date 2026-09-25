import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

/**
 * PreToolUse hook restricting the Agent tool to the subagent types this session actually
 * registered (session.ts's `agents: {...}`, from `AgentSpec.buildSubagents()`) —
 * confirmed empirically that the Agent SDK also exposes a built-in "general-purpose"
 * subagent_type regardless of what `agents` lists, and that spawning one that way
 * inherits the *whole* session's own tools (including Bash, whenever any opt-in subagent
 * turned it on) rather than the narrow `AgentDefinition.tools` each declared subagent
 * actually declares. Without this hook, that built-in type is a way to route around
 * subagentBashGate.ts entirely: once inside it, `agent_id` is set exactly like an
 * intended subagent, so the Bash-from-main-thread check alone can't tell them apart —
 * this is exactly what happened in practice in a real consuming agent (the model delegated a plain
 * file deletion to a spontaneous "general-purpose" agent to get at Bash, instead of using
 * its own tools and leaving the stray file alone).
 */
export function createSubagentTypeGate(allowedTypes: readonly string[]): HookCallback {
  return async (input) => {
    const pre = input as PreToolUseHookInput;
    if (pre.tool_name !== "Agent") return {};

    const subagentType = (pre.tool_input as { subagent_type?: string } | undefined)?.subagent_type;
    if (subagentType && allowedTypes.includes(subagentType)) return {};

    return {
      hookSpecificOutput: {
        hookEventName: pre.hook_event_name,
        permissionDecision: "deny",
        permissionDecisionReason:
          `Delegation is only available for ${allowedTypes.map((t) => `"${t}"`).join("/")} in ` +
          `this session, not "${subagentType ?? "(unset)"}" - do the task directly with your own ` +
          "tools instead of spawning another agent for it.",
      },
    };
  };
}
