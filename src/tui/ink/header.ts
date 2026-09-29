import stringWidth from "string-width";
import { stripAnsi } from "./lineBuffer.js";
import * as ui from "../ui.js";

/** The top of the Ink chat: a title, optional fields and an optional logo. */
export interface HeaderInfo {
  title: string;
  /** Shown under the title as "name value" pairs, e.g. the workspace or the model. */
  fields?: Record<string, string>;
  /**
   * A small logo drawn left of the title, one string per row, colored as the consumer
   * likes. One-column characters only (ASCII, box and block characters such as ▄ ▀ █),
   * never emoji: their width is measured differently by the kit and by the terminal, which
   * would shift the title (see the feature `ink-claude-style`).
   */
  art?: string[];
}

const GAP = "  ";

/**
 * The header as screen lines: the art on the left, padded to its widest row in columns,
 * and the title and fields beside it, vertically centered on the art.
 */
export function headerLines(header: HeaderInfo): string[] {
  const fields = Object.entries(header.fields ?? {}).map(([name, value]) => `${ui.dim(name)} ${value}`);
  const text = [ui.heading(header.title), ...(fields.length > 0 ? [fields.join("   ")] : [])];
  const art = header.art ?? [];
  if (art.length === 0) return text;

  const artWidth = Math.max(...art.map((row) => stringWidth(stripAnsi(row))));
  const height = Math.max(art.length, text.length);
  const textTop = Math.floor((height - text.length) / 2);
  return Array.from({ length: height }, (_, row) => {
    const left = art[row] ?? "";
    const padding = " ".repeat(artWidth - stringWidth(stripAnsi(left)));
    const right = text[row - textTop] ?? "";
    return right ? `${left}${padding}${GAP}${right}` : left;
  });
}
