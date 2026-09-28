/**
 * Pure editing operations on the prompt's text and cursor (a UTF-16 index into `value`),
 * so PromptInput.tsx only maps keys to them. The value may hold line breaks ("\n"): a
 * multi-line prompt.
 */
export interface EditState {
  value: string;
  cursor: number;
}

export function insert({ value, cursor }: EditState, text: string): EditState {
  return { value: value.slice(0, cursor) + text + value.slice(cursor), cursor: cursor + text.length };
}

export function deleteBack({ value, cursor }: EditState): EditState {
  if (cursor === 0) return { value, cursor };
  return { value: value.slice(0, cursor - 1) + value.slice(cursor), cursor: cursor - 1 };
}

/** Delete (Supr): removes the character after the cursor, which stays where it is. */
export function deleteForward({ value, cursor }: EditState): EditState {
  if (cursor >= value.length) return { value, cursor };
  return { value: value.slice(0, cursor) + value.slice(cursor + 1), cursor };
}

// eslint-disable-next-line no-control-regex -- \x1b is the ESC byte the Delete key's sequence starts with
const FORWARD_DELETE = /^\x1b\[3(;[\d:]*)?[~$^]$/;

/**
 * Whether a raw input chunk is the Delete key: `ESC [ 3 ~`, with modifiers `ESC [ 3 ; 5 ~`,
 * rxvt's `ESC [ 3 $` / `ESC [ 3 ^`, or the kitty protocol's `ESC [ 3 ; …~`. Ink reports it and
 * Backspace (`DEL`, 0x7f, which Windows terminals send too) both as `key.delete`, so only the
 * raw sequence tells them apart.
 */
export function isForwardDelete(data: string): boolean {
  return FORWARD_DELETE.test(data);
}

const isSpace = (char: string | undefined): boolean => char !== undefined && /\s/.test(char);

/** Where the word before the cursor starts (spaces right before it skipped). */
function wordStartBefore(value: string, cursor: number): number {
  let i = cursor;
  while (i > 0 && isSpace(value[i - 1])) i--;
  while (i > 0 && !isSpace(value[i - 1])) i--;
  return i;
}

/** Where the word after the cursor ends (spaces right after it skipped). */
function wordEndAfter(value: string, cursor: number): number {
  let i = cursor;
  while (i < value.length && isSpace(value[i])) i++;
  while (i < value.length && !isSpace(value[i])) i++;
  return i;
}

/** Ctrl+W: deletes the word before the cursor. */
export function deleteWordBack({ value, cursor }: EditState): EditState {
  const start = wordStartBefore(value, cursor);
  return { value: value.slice(0, start) + value.slice(cursor), cursor: start };
}

/** Ctrl+K: deletes from the cursor to the end of its line. */
export function killToLineEnd({ value, cursor }: EditState): EditState {
  const end = lineEnd(value, cursor);
  return { value: value.slice(0, cursor) + value.slice(end), cursor };
}

export const wordLeft = ({ value, cursor }: EditState): EditState => ({ value, cursor: wordStartBefore(value, cursor) });
export const wordRight = ({ value, cursor }: EditState): EditState => ({ value, cursor: wordEndAfter(value, cursor) });

function lineStart(value: string, cursor: number): number {
  return value.lastIndexOf("\n", cursor - 1) + 1;
}

function lineEnd(value: string, cursor: number): number {
  const next = value.indexOf("\n", cursor);
  return next === -1 ? value.length : next;
}

/** Home / Ctrl+A and End / Ctrl+E act on the cursor's line. */
export const toLineStart = ({ value, cursor }: EditState): EditState => ({ value, cursor: lineStart(value, cursor) });
export const toLineEnd = ({ value, cursor }: EditState): EditState => ({ value, cursor: lineEnd(value, cursor) });

/** The cursor's line and column (0-based, in UTF-16 units). */
export function cursorLine({ value, cursor }: EditState): { line: number; column: number } {
  const before = value.slice(0, cursor).split("\n");
  return { line: before.length - 1, column: before.at(-1)?.length ?? 0 };
}

/**
 * ↑/↓ inside a multi-line prompt: the same column on the line above or below (or its end
 * if shorter), or null on the first/last line, where the arrows go to the history instead.
 */
export function moveLine(state: EditState, direction: -1 | 1): EditState | null {
  const lines = state.value.split("\n");
  const { line, column } = cursorLine(state);
  const target = line + direction;
  if (target < 0 || target >= lines.length) return null;
  const offset = lines.slice(0, target).reduce((sum, text) => sum + text.length + 1, 0);
  return { value: state.value, cursor: offset + Math.min(column, lines[target].length) };
}

/**
 * Enter after a backslash, as in a shell, continues the prompt on a new line: the
 * backslash becomes the line break. Null when there's no backslash right before the cursor.
 */
export function continueLine(state: EditState): EditState | null {
  if (state.value[state.cursor - 1] !== "\\") return null;
  return insert(deleteBack(state), "\n");
}

/** Pasted blocks, shown in the prompt as a short token and expanded when it's sent. */
export interface PasteRegistry {
  /** Stores `text` and returns the token to insert in its place. */
  add(text: string): string;
  /** Adds `more` to the paste behind `token` (the same paste arriving in pieces); returns its new token. */
  extend(token: string, more: string): string;
  /** `value` with every token replaced by its text. */
  expand(value: string): string;
}

const PASTE_TOKEN = /\[Pasted text #(\d+) \+\d+ lines?\]/g;

function pasteToken(id: number, text: string): string {
  const extra = text.split("\n").length - 1;
  return `[Pasted text #${id} +${extra} ${extra === 1 ? "line" : "lines"}]`;
}

/** Normalizes a pasted chunk's line breaks (terminals send "\r" or "\r\n"). */
export function normalizePaste(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** A paste worth folding into a token: more than one line. */
export function isBlockPaste(text: string): boolean {
  return normalizePaste(text).includes("\n");
}

export function createPasteRegistry(): PasteRegistry {
  const pastes = new Map<number, string>();
  let nextId = 1;
  return {
    add(text) {
      const id = nextId++;
      pastes.set(id, text);
      return pasteToken(id, text);
    },
    extend(token, more) {
      const id = Number(/#(\d+)/.exec(token)?.[1]);
      const text = (pastes.get(id) ?? "") + more;
      pastes.set(id, text);
      return pasteToken(id, text);
    },
    expand(value) {
      return value.replace(PASTE_TOKEN, (token, id: string) => pastes.get(Number(id)) ?? token);
    },
  };
}

/**
 * Ctrl+R: the most recent history entry containing `query`, searching back from before
 * `from` (exclusive; history is oldest first). Returns its index, or -1.
 */
export function searchHistory(history: readonly string[], query: string, from: number = history.length): number {
  if (!query) return -1;
  const needle = query.toLowerCase();
  for (let i = Math.min(from, history.length) - 1; i >= 0; i--) {
    if (history[i].toLowerCase().includes(needle)) return i;
  }
  return -1;
}
