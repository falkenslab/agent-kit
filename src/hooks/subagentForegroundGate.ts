import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

/**
 * PreToolUse hook forcing `run_in_background: false` on every Agent-tool call that spawns
 * one of this session's own subagents. The Agent tool's own input schema defaults to
 * background execution ("Agents run in the background by default", its own description
 * says) unless the model explicitly opts out per call — confirmed empirically (on
 * moodle-agent) that with a less directive prompt, the model left it on that default, the
 * main turn's "result" fired before the subagent had done anything at all, and the whole
 * invocation was silently lost: no file written, no error, nothing — because the caller's
 * message loop had no code watching for background-task completion
 * (SDKTaskStartedMessage/SDKTaskUpdatedMessage/etc. are never handled). Setting
 * `background: false` on the AgentDefinition itself (session.ts's `agents: {...}`) does
 * NOT fix this — confirmed empirically it has no effect on which way the model's own
 * per-call `run_in_background` input resolves. Rewriting the tool input here, before it
 * ever executes, is the only lever that actually forces synchronous execution regardless
 * of what the model asked for.
 */
export function createSubagentForegroundGate(allowedTypes: readonly string[]): HookCallback {
  return async (input) => {
    const pre = input as PreToolUseHookInput;
    if (pre.tool_name !== "Agent") return {};

    const toolInput = pre.tool_input as { subagent_type?: string; run_in_background?: boolean } | undefined;
    if (!toolInput?.subagent_type || !allowedTypes.includes(toolInput.subagent_type)) return {};
    if (toolInput.run_in_background === false) return {}; // already foreground, nothing to change

    return {
      hookSpecificOutput: {
        hookEventName: pre.hook_event_name,
        updatedInput: { ...toolInput, run_in_background: false },
      },
    };
  };
}
