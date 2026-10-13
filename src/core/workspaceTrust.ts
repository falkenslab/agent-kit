import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readLock, type ExtensionDirs, type LockEntry } from "./externalExtensions.js";

/**
 * Trusting a workspace's extensions (#57): a project's scope comes with the project, from whoever
 * shared it (a clone, a download), and its extensions' servers run code on this computer. They
 * run only once the person trusts them in that workspace: what's trusted is each one's code (its
 * files' SHA-256 and its npx packages'), kept in the agent's folder, outside the project, so a
 * project can't trust itself. Another version (a changed lock, an update from someone else) asks
 * again; turning one on or off, or its options, don't. What the person installs into the
 * project's scope themselves is trusted as they install it. The agent's own scope is the
 * person's: it never asks.
 */

const TRUST_FILE = ".trust.json";

type TrustFile = Record<string, Record<string, string>>;

/** What's trusted of an extension: its code, its files' hash and its npx packages'. */
export function codeHash(lock: LockEntry): string {
  const packages = Object.entries(lock.packages ?? {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([spec, cached]) => `${spec}=${cached.sha256}`);
  // A linked one has no hash of its own: its folder is what's trusted.
  return createHash("sha256").update([lock.linked ? `linked:${path.resolve(lock.source)}` : lock.sha256, ...packages].join("\n")).digest("hex");
}

async function readTrust(agentDir: string): Promise<TrustFile> {
  try {
    return JSON.parse(await readFile(path.join(agentDir, TRUST_FILE), "utf8")) as TrustFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

/** The workspace a project scope is, as the trust file names it. */
const workspaceKey = (projectScope: string): string => path.resolve(projectScope);

/** Whether an extension of a project's scope is trusted in that workspace, with the code its lock has now. */
export async function isTrusted(agentDir: string, projectScope: string, name: string, lock: LockEntry): Promise<boolean> {
  return (await readTrust(agentDir))[workspaceKey(projectScope)]?.[name] === codeHash(lock);
}

/** Trusts these extensions of a project's scope, with the code their lock has now. */
export async function trust(agentDir: string, projectScope: string, entries: Record<string, LockEntry>): Promise<void> {
  const file = await readTrust(agentDir);
  const workspace = (file[workspaceKey(projectScope)] ??= {});
  for (const [name, lock] of Object.entries(entries)) workspace[name] = codeHash(lock);
  await mkdir(agentDir, { recursive: true });
  await writeFile(path.join(agentDir, TRUST_FILE), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

/**
 * Trusts a workspace's extensions (its project scope's, all or `names`) with the code its lock
 * has now: what the person does when the chat asks, or with `extension trust`. The names trusted.
 */
export async function trustWorkspace(dirs: ExtensionDirs, names?: readonly string[]): Promise<string[]> {
  if (!dirs.agent || !dirs.project) return [];
  const lock = await readLock(dirs.project);
  const entries = Object.fromEntries(Object.entries(lock).filter(([name]) => !names || names.includes(name)));
  await trust(dirs.agent, dirs.project, entries);
  return Object.keys(entries);
}
