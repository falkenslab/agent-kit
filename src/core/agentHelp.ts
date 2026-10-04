import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentIdentity, Mode } from "./agentSpec.js";
import { agentKitVersion } from "./version.js";

/**
 * The agent's self-knowledge: who it is (a section of the system prompt) and how it is used
 * (the `agent-help` skill). The chat's part of the skill is the kit's, the same for every
 * agent and kept next to the chat's code (`assets/agent-help/SKILL.md`, checked against the
 * chat's commands and keys by a test); the agent's part is its own guide (`AgentSpec.helpGuide`).
 */

/** The plugin the skill is loaded from, as the SDK names its skills ("agent-kit:agent-help"). */
export const AGENT_HELP_SKILL = "agent-kit:agent-help";

/** Absolute path of the kit's part of the skill, next to `dist/` (or `src/` under tsx). */
export function agentHelpSkillPath(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "agent-help", "SKILL.md");
}

/** The "Who you are" section appended to the system prompt: name, version, what it is, the kit's version. */
export function identityPromptSection(identity: AgentIdentity): string {
  const who = `${identity.name}${identity.version ? ` ${identity.version}` : ""}${identity.description ? `: ${identity.description}` : ""}`;
  return `## Who you are
You are ${who}. You are built on agent-kit ${agentKitVersion()}, which provides your chat (its modes, keys and slash commands) and your built-in tools.
When the person asks how to use you (your modes, keys or commands, resuming an earlier conversation, your configuration, what you can do), load the \`agent-help\` skill and answer from it; don't invent options it doesn't list.`;
}

/** What the generated skill says about this session. */
export interface AgentHelpSession {
  mode: Mode;
  /** The modes Shift+Tab goes through (`ModeControl.switchable`). */
  switchable: readonly Mode[];
  /** The built-in knowledge base is on: its slash commands exist. */
  knowledgeBase: boolean;
  /** The sources folder, as shown to the model (e.g. "sources/"). */
  sourcesFolder?: string;
}

/** The skill's "This session" section. */
function sessionSection(session: AgentHelpSession): string {
  const lines = [
    `- This session started in **${session.mode}** mode.`,
    session.switchable.length > 1
      ? `- \`Shift+Tab\` goes through: ${session.switchable.join(", ")}.`
      : "- The mode can't be switched during this session.",
  ];
  if (session.knowledgeBase)
    lines.push(
      "- You keep a knowledge base (your memory across sessions). Its commands: `/knowledge:ingest` (learn the new or changed files of the sources folder), `/knowledge:query <question>` (answer from it), `/knowledge:lint` (check it and fix what's mechanical).",
    );
  if (session.sourcesFolder)
    lines.push(`- Originals go in \`${session.sourcesFolder}\`: the person drops files there (or you ask for one, or download it), and you never change them.`);
  return `## This session\n\n${lines.join("\n")}`;
}

/**
 * Writes the `agent-help` plugin into `dir` (a folder of this run's), with the kit's part of
 * the skill, this session's facts and the agent's own guide, and returns its root. Generated
 * rather than shipped as it is: the guide goes inside the skill, so the agent needs no file
 * tools to read it, and nothing about it reaches the context until the skill is loaded.
 */
export async function writeAgentHelpPlugin(dir: string, session: AgentHelpSession, helpGuide?: string): Promise<string> {
  const kitPart = (await readFile(agentHelpSkillPath(), "utf8")).trimEnd();
  const guide = helpGuide ? (await readFile(helpGuide, "utf8")).trim() : "";
  const agentPart = guide
    ? `## This agent\n\nThe agent's own guide, for everything about its domain (its commands, configuration, folders):\n\n${guide}`
    : "## This agent\n\nThis agent has no guide of its own: for its domain, say only what your instructions tell you, and that the rest isn't documented.";
  await mkdir(path.join(dir, ".claude-plugin"), { recursive: true });
  await mkdir(path.join(dir, "skills", "agent-help"), { recursive: true });
  await writeFile(
    path.join(dir, ".claude-plugin", "plugin.json"),
    `${JSON.stringify({ name: "agent-kit", description: "How to use this agent: the kit's chat and the agent's own guide." }, null, 2)}\n`,
  );
  await writeFile(path.join(dir, "skills", "agent-help", "SKILL.md"), `${kitPart}\n\n${sessionSection(session)}\n\n${agentPart}\n`);
  return dir;
}
