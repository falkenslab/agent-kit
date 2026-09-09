import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { askForDecision } from "./humanInput.js";

/**
 * PreToolUse hook for "interactive" mode: pauses before every action and asks for
 * confirmation (by keyboard or by file, see humanInput.ts), like reviewing a plan step
 * by step.
 */
export function createStepGate(runDir: string): HookCallback {
  return async (input) => {
    const pre = input as PreToolUseHookInput;

    const answer = await askForDecision(runDir, {
      title: "Proposed action",
      lines: [`Tool: ${pre.tool_name}`, `Parameters: ${JSON.stringify(pre.tool_input, null, 2)}`],
    });

    if (answer === "q") {
      return {
        continue: false,
        hookSpecificOutput: {
          hookEventName: pre.hook_event_name,
          permissionDecision: "deny",
          permissionDecisionReason: "Execution stopped manually by the user.",
        },
      };
    }

    const approved = answer === "" || answer === "y" || answer === "yes";

    if (!approved) {
      return {
        hookSpecificOutput: {
          hookEventName: pre.hook_event_name,
          permissionDecision: "deny",
          permissionDecisionReason: "Action rejected by the user in step-by-step mode.",
        },
      };
    }

    return {
      hookSpecificOutput: {
        hookEventName: pre.hook_event_name,
        permissionDecision: "allow",
      },
    };
  };
}
