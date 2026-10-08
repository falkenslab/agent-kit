import { readFile } from "node:fs/promises";
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { SessionFacts } from "../../core/sessionFacts.js";

/**
 * `about_me`, the awareness's one tool (#43): what the agent is right now, read from the
 * session on every call, so it answers with the mode after Shift+Tab, the extensions after
 * `/extensions enable`, the context as it fills; or the agent's own guide to its domain.
 */

const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });

/** A tool's name as the agent's extensions give it, without the `mcp__<server>__` prefix. */
const short = (tool: string): string => tool.replace(/^mcp__.+?__/, "");

/** The session's facts as the model reads them: markdown, in English (ADR-019). */
export function describeSession(facts: SessionFacts): string {
  const who = facts.identity
    ? `${facts.identity.name}${facts.identity.version ? ` ${facts.identity.version}` : ""}${facts.identity.description ? `: ${facts.identity.description}` : ""}`
    : "an agent";
  const sections = [`# You, right now\n\nYou are ${who}, on agent-kit ${facts.kitVersion}.`];

  const others = facts.switchableModes.filter((mode) => mode !== facts.mode);
  sections.push(
    `## Mode\n\n**${facts.mode}**. ${
      facts.switchableModes.length > 1 ? `The person can switch with Shift+Tab, through ${facts.switchableModes.join(", ")} (now: ${others.join(", ")} besides this one).` : "It can't be switched in this session."
    }`,
  );

  const active = facts.extensions.active.map(({ name, description, tools, help }) => {
    const toolList = tools.length ? ` Tools: ${tools.map(short).join(", ")}.` : "";
    return `- **${name}**: ${description}${toolList}${help.map((line) => `\n  ${line}`).join("")}`;
  });
  const inactive = facts.extensions.inactive.map(({ name, reason }) => `- **${name}** is off: it ${reason}.`);
  sections.push(`## Extensions\n\n${[...active, ...inactive].join("\n") || "None."}`);

  if (facts.subagents.length) sections.push(`## Subagents you can delegate to\n\n${facts.subagents.map(({ name, description }) => `- **${name}**: ${description}`).join("\n")}`);

  const own = facts.tools.filter((tool) => !tool.startsWith("mcp__"));
  if (own.length) sections.push(`## Built-in tools\n\n${own.join(", ")}.`);

  if (facts.commands.length) {
    sections.push(`## Commands the person can type\n\n${facts.commands.map(({ name, description, argumentHint }) => `- \`/${name}${argumentHint ? ` ${argumentHint}` : ""}\`${description ? `: ${description}` : ""}`).join("\n")}`);
  } else if (facts.skills.length) {
    sections.push(`## Skills\n\n${facts.skills.join(", ")}.`);
  }

  if (facts.context) {
    const thousands = (tokens: number) => `${Math.round(tokens / 1000)}k`;
    sections.push(`## Context\n\n${Math.round(facts.context.percentage)}% of the context window used (${thousands(facts.context.totalTokens)} of ${thousands(facts.context.maxTokens)} tokens).`);
  }

  return sections.join("\n\n");
}

/** The awareness's MCP server: `about_me`, from the session's facts and the agent's guide. */
export function createAwarenessServer(session: () => Promise<SessionFacts>, helpGuide?: string) {
  const aboutMe = tool(
    "about_me",
    "What you are right now: your mode and the ones the person can switch to, your extensions with their tools and the ones off (with why), your subagents, the commands the person can type, how full your context is. With `part: \"guide\"`, your own guide to your domain (your commands, configuration, folders). It changes during a session: call it whenever the person asks about you, rather than answering from memory.",
    { part: z.enum(["now", "guide"]).optional().describe("`now` (the default): what you are right now. `guide`: your own guide to your domain.") },
    async ({ part }) => {
      if (part === "guide") {
        if (!helpGuide) return ok("You have no guide of your own: for your domain, say only what your instructions tell you, and that the rest isn't documented.");
        return ok(await readFile(helpGuide, "utf8"));
      }
      return ok(describeSession(await session()));
    },
    { annotations: { readOnlyHint: true } },
  );
  return createSdkMcpServer({ name: "awareness", version: "1.0.0", tools: [aboutMe] });
}
