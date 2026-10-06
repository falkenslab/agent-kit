import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSpec, BaseSessionConfig, Mode } from "./agentSpec.js";
import { sourcesExtension } from "../extensions/sources/index.js";
import { knowledgeExtension } from "../extensions/knowledge/index.js";

/**
 * Extensions (ADR-025): what an agent is besides the kit's core. An extension declares what it
 * brings to a session, and `buildSessionOptions()` puts the contributions of the enabled ones
 * together, so the core names none of them. The kit's own (knowledge, sources) are internal:
 * code in `src/extensions/<name>/`, run in the agent's process, with their plugin in
 * `extensions/<name>/`. This file is the only place in the core that imports them (an ESLint
 * rule keeps it so), and no extension imports another: each owns its data, and the model
 * connects them through their tools (#30).
 */

/** What an extension sees of the session it's contributing to. */
export interface ExtensionContext<TConfig extends BaseSessionConfig = BaseSessionConfig> {
  config: TConfig;
  spec: AgentSpec<TConfig>;
  /** This run's folder. */
  runDir: string;
  mode: Mode;
  /** A person can be asked (not autonomous): tools that ask them may exist. */
  interactive: boolean;
}

/** What an extension brings to a session. Every part is optional. */
export interface ExtensionContribution {
  /** MCP servers, by name (`mcp__<name>__<tool>`). */
  mcpServers?: Record<string, McpServerConfig>;
  /** Its plugin (skills, commands), loaded as a local plugin. */
  pluginRoot?: string;
  /** Its skills as the SDK names them (`plugin:skill`), added to an agent's own `skills` list. */
  skills?: string[];
  /** A section of the system prompt, after the agent's own and its identity. */
  promptSection?: string;
  /** Built-in file tools it needs the session to have (`Read`, `Glob`, `Grep`…). */
  fileTools?: string[];
  /** Folders the file tools may read and search, never write (a sources folder). */
  readOnlyDirs?: string[];
  /** Folders reached only through its own tools, never the file tools, and what to use instead. */
  toolOnlyDirs?: { dir: string; instead: string }[];
  /** Its MCP tools that only read: plan mode lets them through. */
  readOnlyTools?: string[];
  /** Its MCP tools that ask the person themselves: interactive mode's step gate doesn't ask first. */
  selfAskingTools?: string[];
  /** Lines about it for agent-help's "This session" (its commands, its folder). */
  helpLines?: string[];
  /** What the session hands back to the host (e.g. the knowledge base's store), by name. */
  api?: Record<string, unknown>;
}

/** An extension: whether it's on for a session, and what it brings when it is. */
export interface Extension {
  name: string;
  enabled(context: ExtensionContext): boolean;
  contribute(context: ExtensionContext): Promise<ExtensionContribution>;
}

/**
 * The kit's internal extensions, in the order their prompt sections go: the sources before the
 * knowledge base, whose section speaks of them.
 */
export const BUILT_IN_EXTENSIONS: readonly Extension[] = [sourcesExtension, knowledgeExtension];

/** The contributions of the extensions enabled for this session, in order. */
export async function contributions(context: ExtensionContext, extensions: readonly Extension[] = BUILT_IN_EXTENSIONS): Promise<ExtensionContribution[]> {
  const enabled = extensions.filter((extension) => extension.enabled(context));
  return Promise.all(enabled.map((extension) => extension.contribute(context)));
}
