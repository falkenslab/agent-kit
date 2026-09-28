import { marked, type Token, type Tokens } from "marked";
import stringWidth from "string-width";
import wrapAnsi from "wrap-ansi";
import { stripAnsi } from "./lineBuffer.js";
import * as ui from "../ui.js";

/**
 * Markdown to terminal lines, in the look of the Claude Code CLI: bold, italic, inline code
 * in blue, lists, headings, quotes, rules, code blocks and tables, wrapped to `width`
 * columns. `marked` only tokenizes; the drawing is ours, so it stays within the kit's
 * alignment rules (one-column glyphs, widths in columns).
 */
export function renderMarkdown(source: string, width: number): string[] {
  const tokens = marked.lexer(source, { gfm: true });
  return renderBlocks(tokens, Math.max(10, width));
}

/** `gap`: a blank line between blocks (not inside a tight list item). */
function renderBlocks(tokens: Token[], width: number, gap = true): string[] {
  const lines: string[] = [];
  for (const token of tokens) {
    const block = renderBlock(token, width);
    if (block === null) continue;
    if (gap && lines.length > 0) lines.push("");
    lines.push(...block);
  }
  return lines;
}

function wrap(text: string, width: number): string[] {
  return wrapAnsi(text, width, { hard: true, trim: false }).split("\n");
}

function renderBlock(token: Token, width: number): string[] | null {
  switch (token.type) {
    case "space":
    case "def":
    case "checkbox": // drawn by renderList() as "[x] " before the item's text
      return null;
    case "paragraph":
    case "text":
      return wrap(inline(token.tokens ?? [], token.text), width);
    case "heading": {
      const heading = token as Tokens.Heading;
      return wrap(ui.bold(inline(heading.tokens, heading.text)), width);
    }
    case "hr":
      return [ui.dim("─".repeat(Math.min(width, 40)))];
    case "code":
      return renderCode(token as Tokens.Code, width);
    case "blockquote": {
      const inner = renderBlocks((token as Tokens.Blockquote).tokens, width - 2);
      return inner.map((line) => `${ui.dim("│")} ${line}`);
    }
    case "list":
      return renderList(token as Tokens.List, width);
    case "table":
      return renderTable(token as Tokens.Table, width);
    case "html":
      return wrap(token.raw.trimEnd(), width);
    default:
      return wrap(token.raw.trimEnd(), width);
  }
}

function renderCode(token: Tokens.Code, width: number): string[] {
  return token.text.split("\n").flatMap((line) => wrap(ui.code(line), width - 2).map((row) => `  ${row}`));
}

function renderList(list: Tokens.List, width: number): string[] {
  const start = typeof list.start === "number" ? list.start : 1;
  const lines: string[] = [];
  list.items.forEach((item, index) => {
    const marker = list.ordered ? `${start + index}.` : "-";
    const indent = stringWidth(marker) + 1;
    const body = renderBlocks(item.tokens, width - indent, list.loose);
    const box = item.task ? (item.checked ? "[x] " : "[ ] ") : "";
    body.forEach((line, i) => {
      lines.push(i === 0 ? `${marker} ${box}${line}` : `${" ".repeat(indent)}${line}`);
    });
    if (list.loose && index < list.items.length - 1) lines.push("");
  });
  return lines;
}

function renderTable(table: Tokens.Table, width: number): string[] {
  const cell = (c: Tokens.TableCell): string => inline(c.tokens, c.text);
  const header = table.header.map(cell);
  const rows = table.rows.map((row) => row.map(cell));
  const widths = header.map((h, i) => Math.max(stringWidth(stripAnsi(h)), ...rows.map((row) => stringWidth(stripAnsi(row[i] ?? "")))));
  const pad = (text: string, i: number): string => text + " ".repeat(Math.max(0, widths[i] - stringWidth(stripAnsi(text))));
  const line = (cells: string[]): string => cells.map(pad).join("  ").trimEnd();
  const out = [ui.bold(line(header)), ui.dim(widths.map((w) => "─".repeat(w)).join("  ")), ...rows.map(line)];
  // A table wider than the room is cut, not wrapped: wrapping would scramble the columns.
  return out.map((row) => (stringWidth(stripAnsi(row)) > width ? wrapAnsi(row, width, { hard: true, wordWrap: false }).split("\n")[0] : row));
}

/** Inline tokens (bold, italic, code, links...) as styled text. */
function inline(tokens: Token[], fallback: string): string {
  if (tokens.length === 0) return fallback;
  return tokens
    .map((token): string => {
      switch (token.type) {
        case "strong":
          return ui.bold(inline((token as Tokens.Strong).tokens, token.raw));
        case "em":
          return ui.italic(inline((token as Tokens.Em).tokens, token.raw));
        case "del":
          return ui.strike(inline((token as Tokens.Del).tokens, token.raw));
        case "codespan":
          return ui.code((token as Tokens.Codespan).text);
        case "link": {
          const link = token as Tokens.Link;
          const text = inline(link.tokens, link.text);
          return stripAnsi(text) === link.href ? ui.code(text) : `${ui.code(text)}${ui.dim(` (${link.href})`)}`;
        }
        case "image":
          return ui.dim(`[${(token as Tokens.Image).text}]`);
        case "br":
          return "\n";
        case "escape":
          return (token as Tokens.Escape).text;
        case "text":
          return token.tokens ? inline(token.tokens, token.text) : decodeEntities(token.text);
        default:
          return token.raw;
      }
    })
    .join("");
}

/** The few HTML entities marked leaves in text tokens. */
function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (_, name: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[name] ?? _);
}

/**
 * Where the finished blocks end in a reply still streaming: after its last blank line
 * outside a code fence. Everything before it renders for good; the rest is still growing.
 */
export function finishedLength(source: string): number {
  let fenceOpen = false;
  let cut = 0;
  let offset = 0;
  for (const line of source.split("\n")) {
    const end = offset + line.length + 1;
    if (/^\s*(```|~~~)/.test(line)) fenceOpen = !fenceOpen;
    else if (!fenceOpen && line.trim() === "" && end <= source.length) cut = end;
    offset = end;
  }
  return cut;
}
