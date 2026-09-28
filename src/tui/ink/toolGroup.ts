import { fitWidth } from "./lineBuffer.js";
import * as ui from "../ui.js";

export interface ToolCall {
  id?: string;
  toolName: string;
  /** The friendly label (see toolLabels.ts), shown when the group is unfolded. */
  label: string;
  result: { isError: boolean; text: string } | null;
  /** For a call that runs a subagent: the labels of the tool calls it made, in order. */
  children?: string[];
}

// A subagent can make many calls; the latest ones are shown, the rest counted.
const MAX_CHILDREN = 5;

/** How a tool counts in a group's summary: the phrase for one call and for several, "{n}" standing for the count. */
export type ToolPhrase = [one: string, many: string];

const BUILT_IN: Record<string, ToolPhrase> = {
  Read: ["read {n} file", "read {n} files"],
  Write: ["wrote {n} file", "wrote {n} files"],
  Edit: ["edited {n} file", "edited {n} files"],
  Glob: ["listed files", "listed files {n} times"],
  Grep: ["searched {n} time", "searched {n} times"],
  Bash: ["ran {n} shell command", "ran {n} shell commands"],
  WebSearch: ["searched the web", "searched the web {n} times"],
  WebFetch: ["fetched {n} page", "fetched {n} pages"],
  Skill: ["used {n} skill", "used {n} skills"],
  Agent: ["ran {n} subagent", "ran {n} subagents"],
  Task: ["ran {n} subagent", "ran {n} subagents"],
};
const OTHER: ToolPhrase = ["used {n} tool", "used {n} tools"];

/**
 * A folded group's one line, as in the Claude Code CLI: "Read 2 files, ran 1 shell
 * command". Calls to the same kind of tool are counted together, in the order they first
 * appear; tools with no phrase of their own (MCP tools, the consumer's) count as "tools",
 * unless `phraseFor` gives one.
 */
export function toolGroupSummary(calls: readonly ToolCall[], phraseFor?: (toolName: string) => ToolPhrase | undefined): string {
  // Counted by the phrase's text: a consumer's phraseFor() may return a new array each call.
  const counts = new Map<string, { phrase: ToolPhrase; n: number }>();
  for (const call of calls) {
    const phrase = phraseFor?.(call.toolName) ?? BUILT_IN[call.toolName] ?? OTHER;
    const key = phrase.join("|");
    const entry = counts.get(key) ?? { phrase, n: 0 };
    entry.n++;
    counts.set(key, entry);
  }
  const text = [...counts.values()].map(({ phrase: [one, many], n }) => (n === 1 ? one : many).replace("{n}", String(n))).join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One line for a tool's result: its first line (in red if it failed) and how many more it had. */
export function resultSummary(result: { isError: boolean; text: string }): string {
  const lines = result.text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return result.isError ? ui.error("error") : ui.dim("(no output)");
  const more = lines.length > 1 ? ui.dim(` (+${lines.length - 1} ${lines.length === 2 ? "line" : "lines"})`) : "";
  return (result.isError ? ui.error(lines[0].trim()) : lines[0].trim()) + more;
}

/**
 * The calls one by one: each behind a `●`, then after `⎿` the calls a subagent made (the
 * latest few, dim) and the result, or "…" while it runs. The line with the result is cut
 * so its "(+N lines)" stays in view.
 */
export function toolGroupExpanded(calls: readonly ToolCall[], width: number): string[] {
  return calls.flatMap((call) => {
    const children = call.children ?? [];
    const shown = children.slice(-MAX_CHILDREN);
    const under = [
      ...(children.length > shown.length ? [ui.dim(`… ${children.length - shown.length} earlier`)] : []),
      ...shown.map((label) => ui.dim(`· ${label}`)),
      call.result ? resultSummary(call.result) : ui.dim("…"),
    ];
    return [
      `${ui.toolBullet("●")} ${fitWidth(call.label, width - 2)}`,
      ...under.map((line, i) => `  ${i === 0 ? ui.dim("⎿") : " "}  ${fitWidth(line, width - 5)}`),
    ];
  });
}
