import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { askForDecision } from "./humanInput.js";
import { isConnectorTool } from "../claudeAiConnectors.js";
import { t } from "../messages/index.js";

/** What a call to a remote MCP server does (#70): goes on, asks the person first, or is blocked. */
export type RemoteServersPolicy = "allow" | "ask" | "deny";

/**
 * PreToolUse hook for remote MCP servers (#70): what the model sends one leaves the computer.
 * - A claude.ai connector's tool the agent didn't choose is always blocked: a connector the
 *   account gained after the session opened, which the session's denylist doesn't name.
 * - A remote server's tool (an installed extension's, the agent's own, a chosen connector) goes
 *   on with `allow`; with `ask`, the person approves each call, told where it goes (blocked when
 *   no one can be asked); with `deny`, it's blocked.
 * Approving gives no decision of its own, so the other gates (plan mode, the file scope) still judge.
 */
export function createRemoteGate(options: {
  runDir: string;
  policy: RemoteServersPolicy;
  /** Where a tool's call goes (a host, a connector), or nothing when it isn't remote. */
  destination: (tool: string) => string | undefined;
  /** The chosen connectors' tool prefixes (`serverToolPrefix()`). */
  allowedConnectors: readonly string[];
  /** Whether a person can be asked now (not autonomous). */
  canAsk: () => boolean;
}): HookCallback {
  const deny = (input: PreToolUseHookInput, reason: string) => ({ hookSpecificOutput: { hookEventName: input.hook_event_name, permissionDecision: "deny" as const, permissionDecisionReason: reason } });
  return async (input) => {
    const pre = input as PreToolUseHookInput;
    const tool = pre.tool_name;
    if (isConnectorTool(tool) && !options.allowedConnectors.some((prefix) => tool.startsWith(prefix))) {
      return deny(pre, "This agent doesn't use that claude.ai connector: it isn't one of the connectors it lets in. Don't call it again.");
    }
    const destination = options.destination(tool);
    if (!destination || options.policy === "allow") return {};
    if (options.policy === "deny" || !options.canAsk()) {
      return deny(pre, `This agent sends nothing to remote servers here: calling ${destination} isn't allowed. Do the task without it, or tell the person it needs that service.`);
    }
    const answer = await askForDecision(options.runDir, {
      title: t().remoteCallTitle(destination),
      lines: [t().toolLine(tool), t().parametersLine(JSON.stringify(pre.tool_input, null, 2))],
    });
    if (answer === "" || answer === "y" || answer === "yes") return {};
    return deny(pre, `The person didn't let this call go to ${destination}.`);
  };
}
