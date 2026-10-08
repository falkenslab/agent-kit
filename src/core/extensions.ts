import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { HookCallbackMatcher, HookEvent, McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import type { AgentSpec, BaseSessionConfig, Mode } from "./agentSpec.js";
import { frontmatter } from "./pluginAgents.js";
import type { ToolLabels } from "./toolLabels.js";
import type { SessionFacts } from "./sessionFacts.js";

/**
 * Extensions (ADR-025): what an agent is besides the kit's core. An extension is a Claude Code
 * plugin with the kit's data in its manifest (`.claude-plugin/plugin.json`, key `"agent-kit"`:
 * the capabilities it `provides` and `requires`), plus, for an internal one, the code that
 * says what it brings to a session. An agent enables the ones it wants (`AgentSpec.extensions`),
 * each made with its own options (the kit's through their factories, `knowledge({ dir })`…);
 * `buildSessionOptions()` puts the contributions of the active ones together, so the core names
 * none of them. The kit's own (awareness, knowledge, sources, memory) live in
 * `src/extensions/<name>/`, their plugin in `extensions/<name>/`; the core never imports them
 * (an ESLint rule keeps it so), and no extension imports another: each owns its data, and the
 * model connects them through their tools (#30).
 */

/** A folder an extension's options name: a path, or one worked out from the session's config (its project). */
export type FolderOption<TConfig extends BaseSessionConfig = BaseSessionConfig> = string | ((config: TConfig) => string | undefined);

/** The folder `option` names for this session's `config`, if any. */
export function folderOf<TConfig extends BaseSessionConfig>(option: FolderOption<TConfig> | undefined, config: BaseSessionConfig): string | undefined {
  return typeof option === "function" ? option(config as TConfig) : option;
}

/** What an extension sees of the session it's contributing to. */
export interface ExtensionContext<TConfig extends BaseSessionConfig = BaseSessionConfig> {
  config: TConfig;
  spec: AgentSpec<TConfig>;
  /** This run's folder. */
  runDir: string;
  mode: Mode;
  /** A person can be asked (not autonomous): tools that ask them may exist. */
  interactive: boolean;
  /**
   * What the session's active extensions provide (their manifests' `provides`), for one that
   * works differently beside another (the knowledge base beside the sources). Known once the
   * extensions are resolved: empty in `missing()`.
   */
  capabilities: ReadonlySet<string>;
  /**
   * What the session is at the moment of the call (#43): its mode now, the extensions running
   * and off, their tools, the subagents, skills, commands and context. The core's facts, read
   * anew on every call; for a tool, not for `contribute()`, which runs before the session exists.
   */
  session(): Promise<SessionFacts>;
}

/** What an extension brings to a session. Every part is optional. */
export interface ExtensionContribution {
  /** MCP servers, by name (`mcp__<name>__<tool>`). */
  mcpServers?: Record<string, McpServerConfig>;
  /** A section of the system prompt, after the agent's own and the list of extensions. */
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
  /** How the chat shows its tools, by full name, in the kit's language: its line and how it counts in a folded group. */
  toolLabels?: ToolLabels;
  /**
   * Its hooks, by event, run after the kit's own: an internal extension's only (the memory
   * hears the person's messages with `UserPromptSubmit`).
   */
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  /** What it says about itself in this session (its commands, its folder), for the agent to tell the person (`SessionFacts`). */
  helpLines?: string[];
  /** What the session hands back to the host (e.g. the knowledge base's store), by name. */
  api?: Record<string, unknown>;
}

/**
 * An internal extension: its plugin (whose manifest gives its name, description and
 * capabilities), what it needs from the session, and what it brings.
 */
export interface Extension {
  /** Its name, the same as its plugin's (`plugin.json`'s `name`). */
  name: string;
  /** Its plugin's root: `.claude-plugin/plugin.json`, and its skills and commands, if any. */
  plugin: string;
  /** Installed rather than shipped in a package (#37): its subagents get no `Bash`, and no plugin hook runs. */
  external?: boolean;
  /** Why it can't run in this session (e.g. "needs a folder (`dir`)"), or `undefined` when it can. */
  missing?(context: ExtensionContext): string | undefined;
  /** What it brings to the session, once it's active. */
  contribute(context: ExtensionContext): Promise<ExtensionContribution>;
}

/** An extension's manifest, as the kit reads it. */
export interface ExtensionManifest {
  name: string;
  description: string;
  /** Capabilities it lets the agent use. */
  provides: string[];
  /** Capabilities it needs another enabled extension to provide. */
  requires: string[];
}

/** Reads an extension's manifest from its plugin. */
export function readExtensionManifest(pluginRoot: string): ExtensionManifest {
  const file = path.join(pluginRoot, ".claude-plugin", "plugin.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as { name?: string; description?: string; "agent-kit"?: { provides?: string[]; requires?: string[] } };
  if (!raw.name) throw new Error(`${file} has no "name".`);
  return { name: raw.name, description: raw.description ?? "", provides: raw["agent-kit"]?.provides ?? [], requires: raw["agent-kit"]?.requires ?? [] };
}

/** The extensions a session runs with, and the ones it can't, with why. */
export interface ResolvedExtensions {
  active: { extension: Extension; manifest: ExtensionManifest }[];
  inactive: { name: string; reason: string }[];
  /** What the active ones provide. */
  capabilities: Set<string>;
}

/**
 * Which of the `extensions` run in this session, in the order given: those the session lacks
 * something for are left out, and so are those requiring a capability no active one provides,
 * until nothing more drops out.
 */
export function resolveExtensions(extensions: readonly Extension[], context: ExtensionContext): ResolvedExtensions {
  const inactive: { name: string; reason: string }[] = [];
  let active: ResolvedExtensions["active"] = [];
  for (const extension of extensions) {
    const manifest = readExtensionManifest(extension.plugin);
    if (manifest.name !== extension.name) throw new Error(`The extension "${extension.name}" has the plugin "${manifest.name}": they must have the same name.`);
    const reason = extension.missing?.(context);
    if (reason) inactive.push({ name: extension.name, reason });
    else active.push({ extension, manifest });
  }
  // Requirements: drop what can't be met, again and again, since dropping one may starve another.
  for (let changed = true; changed; ) {
    changed = false;
    const provided = new Set(active.flatMap(({ manifest }) => manifest.provides));
    for (const entry of active) {
      const unmet = entry.manifest.requires.filter((capability) => !provided.has(capability));
      if (!unmet.length) continue;
      inactive.push({ name: entry.extension.name, reason: `requires ${unmet.join(", ")}, which no enabled extension provides` });
      active = active.filter((other) => other !== entry);
      changed = true;
      break;
    }
  }
  return { active, inactive, capabilities: new Set(active.flatMap(({ manifest }) => manifest.provides)) };
}

/** The prompt's "Extensions" section: what's on, and what isn't and why (ADR-025). */
export function extensionsPromptSection(resolved: ResolvedExtensions): string {
  const lines = resolved.active.map(({ manifest }) => `- **${manifest.name}**: ${manifest.description}${manifest.provides.length ? ` Provides: ${manifest.provides.join(", ")}.` : ""}`);
  const off = resolved.inactive.map(({ name, reason }) => `- **${name}** isn't available: it ${reason}. If the person asks for what it does, tell them why.`);
  return `## Extensions\nWhat you can do besides your own tools comes from these extensions; their sections below say how to use them.\n${[...lines, ...off].join("\n")}`;
}

/**
 * The skills of the plugins in `roots` whose frontmatter `requires` a capability not in
 * `capabilities`, as the SDK names them (`<plugin>:<folder>`): the session leaves them out.
 */
export async function skillsMissingCapabilities(roots: readonly string[], capabilities: ReadonlySet<string>): Promise<string[]> {
  const missing: string[] = [];
  for (const root of roots) {
    let plugin: string | undefined;
    try {
      plugin = (JSON.parse(await readFile(path.join(root, ".claude-plugin", "plugin.json"), "utf8")) as { name?: string }).name;
    } catch {
      continue;
    }
    const folders = await readdir(path.join(root, "skills"), { withFileTypes: true }).catch(() => []);
    for (const folder of folders.filter((entry) => entry.isDirectory())) {
      const text = await readFile(path.join(root, "skills", folder.name, "SKILL.md"), "utf8").catch(() => "");
      const required = requiredCapabilities(text);
      if (required.some((capability) => !capabilities.has(capability))) missing.push(`${plugin}:${folder.name}`);
    }
  }
  return missing;
}

/** A SKILL.md's `requires:` from its frontmatter: `requires: a`, `requires: [a, b]`, `a, b` or a YAML list. */
export function requiredCapabilities(skill: string): string[] {
  const value = frontmatter(skill).fields.requires;
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : value.split(",")).map((item) => item.trim()).filter(Boolean);
}
