import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { askForDecision } from "./humanInput.js";
import { t } from "../messages/index.js";

const SELF_ASKING_SERVERS = ["mcp__approvals__", "mcp__manualLogin__"];
const SELF_ASKING_TOOLS = new Set(["mcp__sourceFiles__request_file", "mcp__sourceFiles__retire_source", "mcp__knowledge__knowledge_retire", "TodoWrite"]);

/**
 * PreToolUse hook for "interactive" mode: pauses before every action and asks for
 * confirmation (by keyboard or by file, see humanInput.ts), like reviewing a plan step
 * by step.
 *
 * `isActive` lets one session switch between "guided" and "interactive" while it runs (see
 * session.ts's `ModeControl`): the hook stays registered and, while inactive, gives no
 * decision at all, so the tool call goes on exactly as if the hook weren't there.
 */
export function createStepGate(runDir: string, isActive: () => boolean = () => true): HookCallback {
  return async (input) => {
    if (!isActive()) return {};
    const pre = input as PreToolUseHookInput;
    // A tool that asks the person itself (an approval, a question, the plan, a file, retiring
    // a source) or only keeps the task list isn't asked about first: that would be asking to ask.
    if (SELF_ASKING_SERVERS.some((prefix) => pre.tool_name.startsWith(prefix)) || SELF_ASKING_TOOLS.has(pre.tool_name)) return {};

    const answer = await askForDecision(runDir, {
      title: t().proposedAction,
      lines: [t().toolLine(pre.tool_name), t().parametersLine(JSON.stringify(pre.tool_input, null, 2))],
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
