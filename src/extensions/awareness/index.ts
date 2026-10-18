import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentIdentity } from "../../core/agentSpec.js";
import type { Extension } from "../../core/extensions.js";
import { agentKitVersion } from "../../core/version.js";
import { awarenessToolLabels } from "./labels.js";
import { createAwarenessServer } from "./tools.js";
import { createCatalogTool } from "./catalog.js";

/** Absolute path of the awareness extension's plugin, next to `dist/` (or `src/` under tsx). */
export function awarenessPluginRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "extensions", "awareness");
}

/** The "Who you are" section of the system prompt: name, version, what it is, the kit's version, and where to look. */
export function identityPromptSection(identity: AgentIdentity, options: { catalog?: boolean } = {}): string {
  const who = `${identity.name}${identity.version ? ` ${identity.version}` : ""}${identity.description ? `: ${identity.description}` : ""}`;
  return `## Who you are
You are ${who}. You are built on agent-kit ${agentKitVersion()}, which provides your chat (its modes, keys and slash commands) and your built-in tools.
- When the person asks about you as you are now (your mode, what you can do, your extensions and their tools, what's off and why, your subagents, commands, how full your context is), call \`about_me\` and answer from it: it changes during the session, so never from memory or from an earlier answer.
- Your mode is the kit's (guided, interactive, autonomous or plan), not a permission mode you may see elsewhere: you don't know which one is on until \`about_me\` says.
- When they ask about your domain (your own commands, configuration, folders), \`about_me\` with \`part: "guide"\`.
- When they ask how to use you (the chat's modes, keys and commands, approvals, resuming, the command line), load the \`help\` skill.
- Don't invent what none of them says.${options.catalog ? `\n${CATALOG_RULES}` : ""}`;
}

/**
 * When the agent can install extensions (#64): look at its catalogs itself, suggest what fits in
 * one sentence, and leave installing to the person. The tool is read-only; these are the rules.
 */
const CATALOG_RULES = `- When the person asks for something none of your tools or skills does well (or that an extension of yours that's off would do), call \`extensions_catalog\` with a few words of the task. If an extension there fits, suggest it in one sentence (what it adds, what it needs, and \`/extensions install <name>@<marketplace>\`) and go on with what you can do without it. Suggest only what it returns; never install, enable or configure an extension yourself; once the person declines one, don't suggest it again in this conversation.
- When they ask what extensions they have, what one does, how to set it up or why it's off, call \`extensions_catalog\` and load the \`extensions\` skill; when they ask what's new, or its copies are over a week old, call it with \`refresh: true\`.`;

/** The awareness extension's options. */
export interface AwarenessOptions {
  /**
   * Absolute path of a markdown guide to the agent's own domain (its commands, configuration,
   * folders), which `about_me` gives the agent when the person asks.
   */
  guide?: string;
}

/**
 * The awareness (#43): the agent knows who it is and what it is at each moment of a session,
 * and the person can ask it. A "Who you are" section, `about_me` (the session's facts, read
 * anew on every call through `ExtensionContext.session()`, and the agent's `guide`), and
 * the `help` skill, how the kit's chat is used, which doesn't change. It needs the spec's
 * `identity`.
 */
export function awareness(options: AwarenessOptions = {}): Extension {
  return {
    name: "awareness",
    plugin: awarenessPluginRoot(),
    missing: ({ spec }) => (spec.identity ? undefined : "needs `identity` in the spec"),
    async contribute({ spec, session, config }) {
      // The catalog only where the agent has a folder for extensions: elsewhere it can't install any (#64).
      const catalog = Boolean(config.extensionDirs);
      return {
        mcpServers: { awareness: createAwarenessServer(session, options.guide, catalog ? [createCatalogTool(config, session)] : []) },
        promptSection: identityPromptSection(spec.identity!, { catalog }),
        readOnlyTools: ["mcp__awareness__about_me", ...(catalog ? ["mcp__awareness__extensions_catalog"] : [])],
        toolLabels: awarenessToolLabels(),
      };
    },
  };
}
