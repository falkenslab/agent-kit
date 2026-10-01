import { appendFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionKey, SessionStore, SessionStoreEntry } from "@anthropic-ai/claude-agent-sdk";

/**
 * One run of an agent: a folder under the agent's runs folder (`<runsDir>/<timestamp>/`)
 * holding its session log, its transcript of tool calls and, with a run store, the SDK's
 * own transcript of the conversation, so a person can resume it later.
 */
export interface RunFolder {
  /** The run's folder. */
  dir: string;
  /** The SDK session kept in this folder (to resume it), or null for a new run. */
  sessionId: string | null;
}

/** A run that kept a conversation, as `listRuns()` lists it for a person to pick (see `/resume`). */
export interface RunSummary extends RunFolder {
  sessionId: string;
  /** When the run's conversation last changed. */
  updatedAt: Date;
  /** The human's last message, on one line (empty if none). */
  lastMessage: string;
}

/** One message of a kept conversation: something the person wrote, or the agent's text reply. */
export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
}

const CONVERSATION = "conversation.jsonl";
const SUBAGENTS = "subagents";
const SESSION = "session.json";

/** A folder name for a new run, e.g. "2026-09-09T16-50-12-345Z" (sorts by date). */
export function runFolderName(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

/** Creates a new, empty run folder under `runsDir`. */
export async function createRunFolder(runsDir: string): Promise<RunFolder> {
  const dir = path.join(runsDir, runFolderName());
  await mkdir(dir, { recursive: true });
  return { dir, sessionId: null };
}

/** What `session.json` holds: the session's id and where each subagent's transcript went. */
interface SessionFile {
  sessionId: string;
  /** The SDK's key for a subagent transcript (opaque to the store) → its file in the run folder. */
  subagents: Record<string, string>;
}

async function readSessionFile(dir: string): Promise<SessionFile | null> {
  try {
    const parsed = JSON.parse(await readFile(path.join(dir, SESSION), "utf8")) as Partial<SessionFile>;
    return typeof parsed.sessionId === "string" ? { sessionId: parsed.sessionId, subagents: parsed.subagents ?? {} } : null;
  } catch {
    return null;
  }
}

/** The SDK session a run folder keeps, from its `session.json`, or null. */
export async function readRunSession(dir: string): Promise<string | null> {
  return (await readSessionFile(dir))?.sessionId ?? null;
}

async function readEntries(file: string): Promise<SessionStoreEntry[] | null> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as SessionStoreEntry);
}

/** A readable, unused file name for a subagent's transcript, from its key (e.g. "subagents/agent-a67…"). */
function subagentFileName(subpath: string, taken: readonly string[]): string {
  const name = subpath.replace(/^subagents\//, "").replace(/[^A-Za-z0-9._-]+/g, "_") || "agent";
  let file = `${SUBAGENTS}/${name}.jsonl`;
  for (let n = 2; taken.includes(file); n++) file = `${SUBAGENTS}/${name}-${n}.jsonl`;
  return file;
}

/**
 * A `SessionStore` (the SDK's adapter for keeping transcripts elsewhere) that keeps one
 * session in one run folder: `conversation.jsonl` for the main transcript,
 * `subagents/*.jsonl` for each subagent's, and `session.json` with the session's id and
 * which file is which subagent's. The SDK appends to it as the transcript grows and loads
 * from it before resuming (confirmed empirically: a resumed session remembers the
 * conversation, its subagents' transcripts included, even with the CLI's own copy deleted).
 * The CLI still writes that copy under `~/.claude/projects/`: it can't be turned off while a
 * store is in use.
 *
 * Bound to one folder, so every key it receives is taken as this run's session: one run
 * folder is one conversation, resumed as many times as wanted (the session keeps its id).
 */
export function createRunStore(dir: string): SessionStore {
  const seen = new Set<string>();
  let session: SessionFile | null = null;
  // Appends are chained: the SDK may call append() again before the last one has finished,
  // and entries must keep their order.
  let queue: Promise<void> = Promise.resolve();

  async function currentSession(): Promise<SessionFile | null> {
    session ??= await readSessionFile(dir);
    return session;
  }

  async function saveSession(next: SessionFile): Promise<void> {
    session = next;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, SESSION), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  /** The file for a key; with `create`, registers the session (and a new subagent) in session.json. */
  async function fileFor(key: SessionKey, create: boolean): Promise<string | null> {
    const current = await currentSession();
    if (!key.subpath) {
      if (create && !current) await saveSession({ sessionId: key.sessionId, subagents: {} });
      return path.join(dir, CONVERSATION);
    }
    const known = current?.subagents[key.subpath];
    if (known) return path.join(dir, known);
    if (!create) return null;
    const base = current ?? { sessionId: key.sessionId, subagents: {} };
    const file = subagentFileName(key.subpath, Object.values(base.subagents));
    await saveSession({ ...base, subagents: { ...base.subagents, [key.subpath]: file } });
    return path.join(dir, file);
  }

  async function write(key: SessionKey, entries: SessionStoreEntry[]): Promise<void> {
    // Retries and replays may send an entry again: its uuid, when it has one, says so.
    const fresh = entries.filter((entry) => {
      if (!entry.uuid) return true;
      const id = `${key.subpath ?? ""}:${entry.uuid}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (fresh.length === 0) return;
    const file = (await fileFor(key, true)) as string;
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, fresh.map((entry) => `${JSON.stringify(entry)}\n`).join(""), "utf8");
  }

  return {
    append(key, entries) {
      queue = queue.then(() => write(key, entries));
      return queue;
    },
    async load(key) {
      const file = await fileFor(key, false);
      const entries = file ? await readEntries(file) : null;
      // What's already there counts as seen: resuming must not append it twice.
      for (const entry of entries ?? []) if (entry.uuid) seen.add(`${key.subpath ?? ""}:${entry.uuid}`);
      return entries;
    },
    async listSubkeys() {
      return Object.keys((await currentSession())?.subagents ?? {});
    },
  };
}

/** A transcript entry's text when it's something the human wrote or the agent replied, or null. */
export function entryText(entry: SessionStoreEntry): ConversationMessage | null {
  if (entry.type !== "user" && entry.type !== "assistant") return null;
  if (entry.isMeta || entry.isSidechain) return null;
  const content = (entry.message as { content?: unknown } | undefined)?.content;
  let text = "";
  if (typeof content === "string") text = content;
  else if (Array.isArray(content)) {
    const parts = content as { type?: string; text?: string }[];
    // A user entry holding tool results isn't something the human wrote.
    if (entry.type === "user" && parts.some((part) => part.type === "tool_result")) return null;
    text = parts
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("");
  }
  // The kit's own notes to the model (a plan-mode switch) go before the human's words.
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>\s*/g, "");
  // Slash commands and the CLI's own notes arrive as tagged text, not as the human's words.
  if (!text.trim() || /^\s*<[a-z-]+>/.test(text)) return null;
  return { role: entry.type, text };
}

/** The human's messages and the agent's replies in a run's conversation, in order. */
export async function readConversation(dir: string): Promise<ConversationMessage[]> {
  const entries = (await readEntries(path.join(dir, CONVERSATION))) ?? [];
  return entries.map(entryText).filter((message): message is ConversationMessage => message !== null);
}

/** The runs under `runsDir` that kept a conversation, newest first; runs without `session.json` are left out. */
export async function listRuns(runsDir: string): Promise<RunSummary[]> {
  let names: string[];
  try {
    names = (await readdir(runsDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
  const runs: RunSummary[] = [];
  for (const name of names) {
    const dir = path.join(runsDir, name);
    const sessionId = await readRunSession(dir);
    if (!sessionId) continue;
    const entries = (await readEntries(path.join(dir, CONVERSATION))) ?? [];
    const times = entries.map((entry) => Date.parse(entry.timestamp ?? "")).filter((ms) => !Number.isNaN(ms));
    const human = entries.map(entryText).filter((message) => message?.role === "user");
    runs.push({
      dir,
      sessionId,
      updatedAt: new Date(times.length > 0 ? Math.max(...times) : 0),
      lastMessage: (human.at(-1)?.text ?? "").replace(/\s+/g, " ").trim(),
    });
  }
  return runs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** `--continue` among the process's arguments: start by resuming the latest run. */
export function continueArgument(argv: readonly string[]): boolean {
  return argv.includes("--continue");
}
