import { readdir } from "node:fs/promises";
import path from "node:path";

const SKIPPED = new Set(["node_modules"]);

/**
 * Files under `root` for `@` mentions, as paths relative to it with forward slashes. Skips
 * `node_modules` and dot folders (`.git`, `.run`...), and stops at `limit` files so a huge
 * tree can't stall the chat.
 */
export async function listProjectFiles(root: string, limit = 5000): Promise<string[]> {
  const files: string[] = [];
  const pending = [""];
  while (pending.length > 0 && files.length < limit) {
    const dir = pending.shift()!;
    let entries;
    try {
      entries = await readdir(path.join(root, dir), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || SKIPPED.has(entry.name)) continue;
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) pending.push(relative);
      else if (entry.isFile()) files.push(relative);
      if (files.length >= limit) break;
    }
  }
  return files.sort();
}

/** The `@mention` being typed right before the cursor: where it starts and what follows the `@`. */
export function mentionAt(value: string, cursor: number): { start: number; query: string } | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, cursor));
  if (!match) return null;
  return { start: cursor - match[2].length - 1, query: match[2] };
}

/** Files containing `query` (case-insensitive), the ones whose name starts with it first, then shorter paths. */
export function matchingFiles(files: readonly string[], query: string, max = 6): string[] {
  const needle = query.toLowerCase();
  const name = (file: string) => file.slice(file.lastIndexOf("/") + 1).toLowerCase();
  return files
    .filter((file) => file.toLowerCase().includes(needle))
    .sort((a, b) => Number(!name(a).startsWith(needle)) - Number(!name(b).startsWith(needle)) || a.length - b.length || a.localeCompare(b))
    .slice(0, max);
}
