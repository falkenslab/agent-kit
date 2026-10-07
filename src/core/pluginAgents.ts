import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

/**
 * A plugin's subagents (`agents/<file>.md`, ADR-025), read so the session registers them as it
 * does an agent's own from `buildSubagents()`: in the type gate's allow-list, in the `Agent` and
 * `Bash` decision, and with the reply-language line. The SDK loads them itself as
 * `<plugin>:<name>`, the name from the frontmatter, not the file (confirmed empirically); a
 * definition under that same key in `options.agents` replaces the plugin's (also confirmed), which
 * is how the kit adds the line.
 */

/** A markdown file's frontmatter: `key: value`, with `[a, b]`, `a, b` or a YAML list for lists. */
export function frontmatter(text: string): { fields: Record<string, string | string[]>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { fields: {}, body: text };
  const fields: Record<string, string | string[]> = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const [, key, raw] = kv;
    if (raw === "") {
      const items: string[] = [];
      while (i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1])) items.push(lines[++i].replace(/^\s+-\s*/, ""));
      fields[key] = items.map(unquote);
    } else if (/^\[.*\]$/.test(raw)) {
      fields[key] = raw.slice(1, -1).split(",").map(unquote).filter(Boolean);
    } else {
      fields[key] = unquote(raw);
    }
  }
  return { fields, body: text.slice(match[0].length).trim() };
}

const unquote = (value: string): string => value.trim().replace(/^["']|["']$/g, "");

/** A field as a list: a list as is, `a, b` split on commas. */
function list(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : value.split(",").map(unquote).filter(Boolean);
}

/**
 * The subagents of the plugins in `roots`, by the name the SDK gives them (`<plugin>:<name>`):
 * `description` and the body as the prompt, `tools` (none listed: it inherits the session's),
 * `model` and `maxTurns` when given.
 */
export async function pluginAgents(roots: readonly string[]): Promise<Record<string, AgentDefinition>> {
  const agents: Record<string, AgentDefinition> = {};
  for (const root of roots) {
    let plugin: string | undefined;
    try {
      plugin = (JSON.parse(await readFile(path.join(root, ".claude-plugin", "plugin.json"), "utf8")) as { name?: string }).name;
    } catch {
      continue;
    }
    const files = await readdir(path.join(root, "agents")).catch(() => [] as string[]);
    for (const file of files.filter((name) => name.endsWith(".md"))) {
      const { fields, body } = frontmatter(await readFile(path.join(root, "agents", file), "utf8"));
      const name = typeof fields.name === "string" && fields.name ? fields.name : file.replace(/\.md$/, "");
      const tools = list(fields.tools);
      const maxTurns = typeof fields.maxTurns === "string" ? Number(fields.maxTurns) : undefined;
      agents[`${plugin}:${name}`] = {
        description: typeof fields.description === "string" ? fields.description : "",
        prompt: body,
        ...(tools ? { tools } : {}),
        ...(typeof fields.model === "string" ? { model: fields.model as AgentDefinition["model"] } : {}),
        ...(maxTurns && Number.isFinite(maxTurns) ? { maxTurns } : {}),
      };
    }
  }
  return agents;
}
