import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentIdentity } from "../../core/agentSpec.js";
import type { Extension } from "../../core/extensions.js";
import { agentKitVersion } from "../../core/version.js";
import { awarenessToolLabels } from "./labels.js";
import { createAwarenessServer } from "./tools.js";

/** Absolute path of the awareness extension's plugin, next to `dist/` (or `src/` under tsx). */
export function awarenessPluginRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "extensions", "awareness");
}

/** The "Who you are" section of the system prompt: name, version, what it is, the kit's version, and where to look. */
export function identityPromptSection(identity: AgentIdentity): string {
  const who = `${identity.name}${identity.version ? ` ${identity.version}` : ""}${identity.description ? `: ${identity.description}` : ""}`;
  return `## Who you are
You are ${who}. You are built on agent-kit ${agentKitVersion()}, which provides your chat (its modes, keys and slash commands) and your built-in tools.
- When the person asks about you as you are now (your mode, what you can do, your extensions and their tools, what's off and why, your subagents, commands, how full your context is), call \`about_me\` and answer from it: it changes during the session, so never from memory or from an earlier answer.
- Your mode is the kit's (guided, interactive, autonomous or plan), not a permission mode you may see elsewhere: you don't know which one is on until \`about_me\` says.
- When they ask about your domain (your own commands, configuration, folders), \`about_me\` with \`part: "guide"\`.
- When they ask how to use you (the chat's modes, keys and commands, approvals, resuming, the command line), load the \`help\` skill.
- Don't invent what none of them says.`;
}

/**
 * The awareness (#43): the agent knows who it is and what it is at each moment of a session,
 * and the person can ask it. A "Who you are" section, `about_me` (the session's facts, read
 * anew on every call through `ExtensionContext.session()`, and the agent's `helpGuide`), and
 * the `help` skill, how the kit's chat is used, which doesn't change.
 */
export const awarenessExtension: Extension = {
  name: "awareness",
  plugin: awarenessPluginRoot(),
  missing: ({ spec }) => (spec.identity ? undefined : "needs `identity` in the spec"),
  async contribute({ spec, session }) {
    return {
      mcpServers: { awareness: createAwarenessServer(session, spec.helpGuide) },
      promptSection: identityPromptSection(spec.identity!),
      readOnlyTools: ["mcp__awareness__about_me"],
      toolLabels: awarenessToolLabels(),
    };
  },
};
