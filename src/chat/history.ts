import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** One line the person sent, as the history file keeps it. */
export interface HistoryEntry {
  text: string;
  timestamp: string;
}

/** Keeps only the most recent `limit` entries (oldest-first order in, oldest-first out). */
export function capHistory(entries: readonly HistoryEntry[], limit: number): HistoryEntry[] {
  return entries.length > limit ? entries.slice(-limit) : entries.slice();
}

/** Oldest-first. Missing file reads as empty — nothing to load yet is the normal case. */
export async function loadHistory(filePath: string): Promise<HistoryEntry[]> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as HistoryEntry);
}

/** Overwrites the whole file (not appended) so a prior prune (oldest entries dropped) sticks. */
export async function saveHistory(filePath: string, entries: readonly HistoryEntry[]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const body = entries.map((entry) => JSON.stringify(entry)).join("\n");
  await writeFile(filePath, entries.length > 0 ? `${body}\n` : "", "utf8");
}

/**
 * The command name a typed line would invoke (e.g. "chiste" for both "/chiste" and
 * "/chiste con salsa"), or `null` for a line that isn't a slash command at all (doesn't
 * start with "/") or is just a bare "/" with nothing after it.
 */
export function slashCommandToken(line: string): string | null {
  if (!line.startsWith("/")) return null;
  const token = line.slice(1).split(/\s/, 1)[0];
  return token ? token : null;
}
