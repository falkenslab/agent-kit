import path from "node:path";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import type { ModeControl } from "../core/session.js";
import { continueArgument, createRunFolder, listRuns, readRunSession, type RunFolder, type RunSummary } from "../core/runs.js";
import { getLanguage, t } from "../core/messages/index.js";

/**
 * Builds the session's options for a run folder, e.g.
 * `(run) => buildSessionOptions(config, run.dir, spec, { run })`: called for the first run
 * and again for each one resumed with /resume (MCP servers, the step gate and the transcript
 * are bound to the run's folder, so they're built anew).
 */
export type SessionOpener = (run: RunFolder) => Promise<Options | { options: Options; modeControl?: ModeControl }>;

export interface OpenedSession {
  run: RunFolder;
  options: Options;
  modeControl?: ModeControl;
}

/** The run a chat starts with: the latest one with `--continue` (if any), a new one otherwise. */
export async function firstRun(runsDir: string, argv: readonly string[] = process.argv.slice(2)): Promise<RunFolder> {
  if (continueArgument(argv)) {
    const [latest] = await listRuns(runsDir);
    if (latest) return { dir: latest.dir, sessionId: latest.sessionId };
  }
  return await createRunFolder(runsDir);
}

export async function openSession(opener: SessionOpener, run: RunFolder): Promise<OpenedSession> {
  const opened = await opener(run);
  // The SDK's Options has no "options" field: this is buildSessionOptions()'s result.
  return "options" in opened ? { run, options: opened.options, modeControl: opened.modeControl } : { run, options: opened };
}

/** A run's date for a person, in the kit's language. */
export function runDate(date: Date): string {
  return new Intl.DateTimeFormat(getLanguage(), { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** A run in the /resume list: its date and the human's last message. */
export function runLabel(run: RunSummary, current?: RunFolder): string {
  const mark = current && path.resolve(current.dir) === path.resolve(run.dir) ? ` ${t().currentRun}` : "";
  return `${runDate(run.updatedAt)}${mark}${run.lastMessage ? ` · ${run.lastMessage}` : ""}`;
}

/** The run folder of a summary, re-reading its session (a run resumed a moment ago may have changed). */
export async function runFolderOf(run: RunSummary): Promise<RunFolder> {
  return { dir: run.dir, sessionId: (await readRunSession(run.dir)) ?? run.sessionId };
}
