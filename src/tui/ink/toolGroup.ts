import { fitWidth, stripAnsi } from "./lineBuffer.js";
import { renderMarkdown } from "./markdown.js";
import * as ui from "../ui.js";
import { t, type ToolPhrase } from "../../core/messages/index.js";

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
// Tools whose result is a subagent's answer, in markdown: its first line is rendered.
const SUBAGENT_TOOLS = new Set(["Agent", "Task"]);

/** How a tool counts in a group's summary: the phrase for one call and for several, "{n}" standing for the count. */
export type { ToolPhrase };

/**
 * How much of its tool calls a chat shows: `"full"`, every call with its result line;
 * `"calls"`, the calls without their results (a failed call says so in one short line);
 * `"summary"`, one line per group. Ctrl+O unfolds any of them into the full view.
 */
export type ToolDetail = "full" | "calls" | "summary";

/**
 * The line shown under a tool call for its result: a string replaces the kit's (plain text,
 * drawn in the result's color, or the error color if it failed), `null` hides it, and
 * `undefined` keeps the kit's (the result's first line).
 */
export type ResultFormatter = (toolName: string, result: { isError: boolean; text: string }) => string | null | undefined;

/** How `toolGroupExpanded()` draws the results. */
export interface ResultOptions {
  /** Show the result lines (the default); without them a failed call shows a short failure line. */
  results?: boolean;
  formatResult?: ResultFormatter;
}

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
    const phrase = phraseFor?.(call.toolName) ?? t().toolPhrases[call.toolName] ?? t().otherTools;
    const key = phrase.join("|");
    const entry = counts.get(key) ?? { phrase, n: 0 };
    entry.n++;
    counts.set(key, entry);
  }
  const text = [...counts.values()].map(({ phrase: [one, many], n }) => (n === 1 ? one : many).replace("{n}", String(n))).join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * One line for a tool's result: its first line (in red if it failed) and how many more it
 * had. `markdown`: the first line is rendered (a subagent's answer), so no "**" or
 * backticks show.
 */
export function resultSummary(result: { isError: boolean; text: string }, markdown = false): string {
  const lines = result.text.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return result.isError ? ui.error(t().error) : ui.dim(t().noOutput);
  const more = lines.length > 1 ? ui.dim(` ${t().moreResultLines(lines.length - 1)}`) : "";
  const first = lines[0].trim();
  if (result.isError) return ui.error(first) + more;
  // Rendered wide, as one row: the summary line is cut to the room left afterwards.
  // Plain before the theme's color: a style the markdown opened and closed (bold's reset)
  // would cancel a dim around it.
  return ui.toolResult(markdown ? stripAnsi(renderMarkdown(first, 1000)[0] ?? first) : first) + more;
}

/** The line under a call for its result, or null for none. */
function resultLine(call: ToolCall, { results = true, formatResult }: ResultOptions): string | null {
  if (!call.result) return results ? ui.dim("…") : null;
  if (!results) return call.result.isError ? ui.error(t().toolFailed) : null;
  const custom = formatResult?.(call.toolName, call.result);
  if (custom === null) return null;
  if (custom !== undefined) return call.result.isError ? ui.error(custom) : ui.toolResult(custom);
  return resultSummary(call.result, SUBAGENT_TOOLS.has(call.toolName));
}

/**
 * The calls one by one: each behind a `●`, then after `⎿` the calls a subagent made (the
 * latest few, dim) and the result in one line (a subagent's answer with its markdown
 * rendered), or "…" while it runs. Without `options.results`, only a failure's short line.
 */
export function toolGroupExpanded(calls: readonly ToolCall[], width: number, options: ResultOptions = {}): string[] {
  return calls.flatMap((call) => {
    const children = call.children ?? [];
    const shown = children.slice(-MAX_CHILDREN);
    const result = resultLine(call, options);
    const under = [
      ...(children.length > shown.length ? [ui.dim(t().earlierCalls(children.length - shown.length))] : []),
      ...shown.map((label) => fitWidth(ui.dim(`· ${label}`), width - 5)),
      ...(result === null ? [] : [fitWidth(result, width - 5)]),
    ];
    return [
      `${ui.toolBullet("●")} ${fitWidth(ui.toolLabel(call.label), width - 2)}`,
      ...under.map((line, i) => (line === "" ? "" : `  ${i === 0 ? ui.dim("⎿") : " "}  ${line}`)),
    ];
  });
}
