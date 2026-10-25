import { readFile } from "node:fs/promises";
import path from "node:path";
import { isRemoteServer, type PluginServer } from "./externalExtensions.js";

/** A project server left out because an installed extension's is the same service (#83). */
export interface ProjectServerDuplicate {
  /** Its name in the project's `.mcp.json`. */
  server: string;
  /** What it is: the remote server's URL, or the npm package it runs. */
  target: string;
  /** The extension whose server is used instead. */
  extension: string;
}

/** What a server is, to compare two: a remote one's URL, or the npm package an `npx` / `bunx` / `uvx` one runs (its version aside). */
export function serverTarget(server: { url?: string; command?: string; args?: string[] }): string | undefined {
  if (typeof server.url === "string" && server.url) return server.url.trim().toLowerCase().replace(/\/+$/, "");
  if (typeof server.command !== "string") return undefined;
  const runner = path.basename(server.command).toLowerCase().replace(/\.(cmd|exe)$/, "");
  if (!["npx", "bunx", "uvx", "pnpx"].includes(runner)) return undefined;
  const spec = (server.args ?? []).find((arg) => typeof arg === "string" && !arg.startsWith("-"));
  if (!spec) return undefined;
  // @scope/name@1.2.3 → @scope/name; name@1 → name.
  const at = spec.indexOf("@", spec.startsWith("@") ? 1 : 0);
  return (at > 0 ? spec.slice(0, at) : spec).toLowerCase();
}

/**
 * The servers of the project's `.mcp.json` an installed extension's server duplicates (#83): the
 * same remote URL, or the same npm package, whose own sign-in notice and settings (another
 * version, other courses) would sit beside the extension's and mislead the model. Every other
 * project server stays: the agent can use them as Claude Code would. A name the kit passes itself
 * is never left out: the denylist goes by name, and would take the kit's server too.
 */
export async function projectServerDuplicates(
  projectDir: string,
  extensions: readonly { name: string; servers: Record<string, PluginServer> }[],
  passed: ReadonlySet<string>,
): Promise<{ file: string; duplicates: ProjectServerDuplicate[] } | undefined> {
  const file = path.join(projectDir, ".mcp.json");
  let servers: Record<string, { url?: string; command?: string; args?: string[] }>;
  try {
    const raw = JSON.parse(await readFile(file, "utf8")) as { mcpServers?: unknown };
    servers = raw.mcpServers && typeof raw.mcpServers === "object" ? (raw.mcpServers as typeof servers) : {};
  } catch {
    return undefined;
  }
  const theirs = extensions.flatMap(({ name, servers: own }) =>
    Object.values(own).flatMap((server) => {
      const target = serverTarget(isRemoteServer(server) ? { url: server.url } : server);
      return target ? [{ extension: name, target }] : [];
    }),
  );
  const duplicates: ProjectServerDuplicate[] = [];
  for (const [name, server] of Object.entries(servers)) {
    if (passed.has(name) || !server || typeof server !== "object") continue;
    const target = serverTarget(server);
    const same = target ? theirs.find((candidate) => candidate.target === target) : undefined;
    if (same) duplicates.push({ server: name, target: server.url ?? target!, extension: same.extension });
  }
  return duplicates.length ? { file, duplicates } : undefined;
}
