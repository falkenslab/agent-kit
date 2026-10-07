import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { frontmatter } from "../../core/pluginAgents.js";

/**
 * The memory of the person (#34): one markdown file per entry in the agent's own folder, outside
 * any project, like Claude Code's auto-memory (a name, a one-line description, a type, the body).
 * Only the `memory_*` tools reach it.
 */

/** What an entry is about: who the person is, or how they want things done. */
export type MemoryType = "user" | "feedback";

export const MEMORY_TYPES: readonly MemoryType[] = ["user", "feedback"];

/** One thing the agent remembers about the person. */
export interface MemoryEntry {
  /** Its name, kebab-case: also its file (`<name>.md`). */
  name: string;
  /** One line: what the index shows. */
  description: string;
  type: MemoryType;
  /** The whole of it: for `feedback`, the why and how to apply it. */
  body: string;
  /** When it was last saved, ISO 8601 in UTC. */
  updated: string;
}

/** How many entries the system prompt lists, the most recently saved first (#34). */
export const ENTRIES_IN_PROMPT = 50;

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The memory in `dir`: list, read, save and forget entries. */
export function createMemoryStore(dir: string) {
  const file = (name: string): string => {
    if (!NAME.test(name)) throw new Error(`"${name}" isn't a valid entry name: use kebab-case, e.g. "prefers-short-answers".`);
    return path.join(dir, `${name}.md`);
  };

  async function read(name: string): Promise<MemoryEntry | undefined> {
    let text: string;
    try {
      text = await readFile(file(name), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
    const { fields, body } = frontmatter(text);
    const field = (key: string): string => [fields[key] ?? ""].flat().join(", ");
    const type = MEMORY_TYPES.find((known) => known === field("type")) ?? "user";
    return { name, description: field("description"), type, body: body.trim(), updated: field("updated") };
  }

  return {
    /** Every entry, the most recently saved first. */
    async list(): Promise<MemoryEntry[]> {
      const names = (await readdir(dir).catch(() => [] as string[])).filter((entry) => entry.endsWith(".md")).map((entry) => entry.slice(0, -3));
      const entries = (await Promise.all(names.filter((name) => NAME.test(name)).map(read))).filter((entry): entry is MemoryEntry => Boolean(entry));
      return entries.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : a.name.localeCompare(b.name)));
    },
    read,
    /** Creates or replaces an entry; says which. */
    async save(entry: Omit<MemoryEntry, "updated">): Promise<"created" | "updated"> {
      const target = file(entry.name);
      const existed = Boolean(await read(entry.name));
      const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim();
      await mkdir(dir, { recursive: true });
      const text = `---\nname: ${entry.name}\ndescription: ${oneLine(entry.description)}\ntype: ${entry.type}\nupdated: ${new Date().toISOString()}\n---\n\n${entry.body.trim()}\n`;
      await writeFile(target, text, "utf8");
      return existed ? "updated" : "created";
    },
    /** Forgets an entry; false when there was none. */
    async forget(name: string): Promise<boolean> {
      const target = file(name);
      if (!(await read(name))) return false;
      await rm(target);
      return true;
    },
  };
}

export type MemoryStore = ReturnType<typeof createMemoryStore>;

/** An entry's line in the index: `- name (type): description`. */
export function indexLine(entry: MemoryEntry): string {
  return `- ${entry.name} (${entry.type}): ${entry.description}`;
}
