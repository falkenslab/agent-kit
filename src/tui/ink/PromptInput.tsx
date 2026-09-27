import { useContext, useLayoutEffect, useReducer, useRef, type ReactNode } from "react";
import { Box, Text, useInput, useStdout, type DOMElement, type Key } from "ink";
import stringWidth from "string-width";
import { fitWidth, stripAnsi } from "./lineBuffer.js";
import { liveWidth } from "./sessionModel.js";
import { isMouseReport } from "./fullscreen.js";
import { CursorContext } from "./terminalCursor.js";
import { isFocusReport } from "./terminalStatus.js";
import {
  continueLine,
  createPasteRegistry,
  cursorLine,
  deleteBack,
  deleteWordBack,
  insert,
  isBlockPaste,
  killToLineEnd,
  moveLine,
  normalizePaste,
  searchHistory,
  toLineEnd,
  toLineStart,
  wordLeft,
  wordRight,
  type EditState,
} from "./promptEditing.js";
import * as ui from "../ui.js";

const MAX_SUGGESTIONS = 6;

/** Commands (names without "/") a partial "/name" line could still become. */
export function matchingCommands(value: string, commands: readonly string[]): string[] {
  if (!value.startsWith("/") || /\s/.test(value)) return [];
  const typed = value.slice(1);
  return commands.filter((name) => name.startsWith(typed));
}

/** Tab: completes a unique match (plus a space for its arguments), else the common prefix. */
export function completeCommand(value: string, commands: readonly string[]): string {
  const matches = matchingCommands(value, commands);
  if (matches.length === 0) return value;
  if (matches.length === 1) return `/${matches[0]} `;
  let prefix = matches[0];
  for (const name of matches) {
    while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return `/${prefix}`;
}

/**
 * The slice [start, end) of a `length`-character line shown in `room` columns, keeping the
 * cursor in view: like the live area, the prompt must never reach the terminal's edge (see
 * lineBuffer.ts), so a long line scrolls sideways, with "…" on each cut side.
 */
export function visibleWindow(length: number, cursor: number, room: number): [number, number] {
  if (length + 1 <= room) return [0, length];
  const span = Math.max(1, room - 2); // one column for each possible "…"
  const start = Math.min(Math.max(0, cursor + 1 - span), Math.max(0, length + 1 - span));
  return [start, Math.min(length, start + span)];
}

export interface PromptInputProps {
  label: string;
  /** Columns taken around the prompt (a frame), so a long line scrolls before reaching the edge. */
  inset?: number;
  /** A suggested prompt, shown dim in the empty prompt; Tab takes it. */
  suggestion?: string | null;
  /** Earlier lines, oldest first, for ↑/↓ and Ctrl+R. */
  history: readonly string[];
  /** Slash command names (without "/") for suggestions and Tab completion. */
  commands: readonly string[];
  /** Gets the text as sent: pasted blocks expanded. */
  onSubmit(line: string): void;
  /** Ctrl+D on an empty line. */
  onExit(): void;
  /** ↑ on an empty prompt: takes the last queued line back (see runChatInk.tsx), or null if none. */
  onRecallQueued?: () => string | null;
}

interface SearchState {
  query: string;
  /** Index in `history` of the match shown, or -1. */
  index: number;
  /** What the prompt held when the search started, restored by Esc. */
  saved: EditState;
}

// A paste can reach us in several chunks; pieces this close together extend the same one.
const PASTE_CHUNK_MS = 100;
const PASTE_TOKEN_BEFORE = /\[Pasted text #\d+ \+\d+ lines?\]$/;

/**
 * The chat's prompt: history (↑/↓), "/command" completion and suggestions (Tab), pasted
 * blocks folded into a token, multi-line input (`\` + Enter or Ctrl+J), word and line
 * shortcuts (Ctrl+W/K/U, Ctrl+←/→, Home/End, Ctrl+A/E), reverse history search (Ctrl+R)
 * and taking a queued line back (↑ on an empty prompt). Written here rather than taken from
 * @inkjs/ui because its TextInput is uncontrolled. Backspace also arrives as `delete` on
 * Windows terminals, so both erase backwards.
 */
export function PromptInput({ label, inset = 0, suggestion, history, commands, onSubmit, onExit, onRecallQueued }: PromptInputProps) {
  // Kept in a ref, not in state: two keystrokes can arrive before React re-renders, and a
  // handler reading state would apply the second one to a stale value.
  const state = useRef({
    value: "",
    cursor: 0,
    historyIndex: null as number | null,
    draft: "",
    search: null as SearchState | null,
    lastPaste: null as { token: string; at: number } | null,
  });
  const pastes = useRef(createPasteRegistry()).current;
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  function apply(next: EditState): void {
    state.current.value = next.value;
    state.current.cursor = next.cursor;
  }

  function replace(next: string): void {
    apply({ value: next, cursor: next.length });
  }

  /** A key while Ctrl+R's search is on: Ctrl+R finds an older match, Enter (or any other key) takes it, Esc cancels. */
  function handleSearch(search: SearchState, input: string, key: Key): void {
    const current = state.current;
    const finish = (take: boolean): void => {
      current.search = null;
      if (take && search.index >= 0) replace(history[search.index]);
      else apply(search.saved);
    };
    if (key.ctrl && input === "r") {
      const older = searchHistory(history, search.query, search.index >= 0 ? search.index : history.length);
      if (older >= 0) search.index = older;
    } else if (key.escape) {
      finish(false);
    } else if (key.return) {
      finish(true);
    } else if (key.backspace || key.delete) {
      search.query = search.query.slice(0, -1);
      search.index = searchHistory(history, search.query);
    } else if (input && !key.ctrl && !key.meta) {
      search.query += input;
      search.index = searchHistory(history, search.query);
    } else {
      finish(true);
    }
  }

  function handlePaste(input: string): void {
    const current = state.current;
    const text = normalizePaste(input);
    const now = Date.now();
    const last = current.lastPaste;
    const before = current.value.slice(0, current.cursor);
    // Typing sends one character at a time: only a multi-character chunk can be more of a paste.
    if (last && input.length > 1 && now - last.at < PASTE_CHUNK_MS && before.endsWith(last.token)) {
      // The rest of the same paste: grow its token in place.
      const token = pastes.extend(last.token, text);
      const start = current.cursor - last.token.length;
      apply({ value: current.value.slice(0, start) + token + current.value.slice(current.cursor), cursor: start + token.length });
      current.lastPaste = { token, at: now };
    } else if (isBlockPaste(text)) {
      const token = pastes.add(text);
      apply(insert(current, token));
      current.lastPaste = { token, at: now };
    } else {
      apply(insert(current, text));
    }
  }

  useInput((input, key) => {
    // In full screen the mouse is reported as input (wheel, selection): never type it.
    // Nor the terminal's focus reports (see terminalStatus.ts).
    if (isMouseReport(input) || isFocusReport(input)) return;
    const current = state.current;
    if (current.search) {
      handleSearch(current.search, input, key);
      rerender();
      return;
    }
    const { value, cursor } = current;
    if (key.return) {
      const continued = continueLine(current);
      if (continued) {
        apply(continued);
        rerender();
        return;
      }
      replace("");
      current.historyIndex = null;
      rerender();
      onSubmit(pastes.expand(value));
      return;
    }
    if (input === "\n" && !key.ctrl) {
      apply(insert(current, "\n")); // Ctrl+J: a line break without sending
    } else if (key.ctrl && input === "d") {
      if (value === "") onExit();
      return;
    } else if (key.ctrl && input === "u") {
      replace(""); // clears the whole prompt
      current.historyIndex = null;
    } else if (key.ctrl && input === "w") {
      apply(deleteWordBack(current));
    } else if (key.ctrl && input === "k") {
      apply(killToLineEnd(current));
    } else if (key.ctrl && input === "r") {
      current.search = { query: "", index: -1, saved: { value, cursor } };
    } else if (key.upArrow) {
      const moved = moveLine(current, -1);
      if (moved) {
        apply(moved);
      } else if (value === "" && onRecallQueued) {
        const queued = onRecallQueued();
        if (queued !== null) replace(queued);
        else return upHistory();
      } else {
        return upHistory();
      }
    } else if (key.downArrow) {
      const moved = moveLine(current, 1);
      if (moved) apply(moved);
      else return downHistory();
    } else if (key.tab) {
      // An empty prompt takes the suggestion; otherwise Tab completes a "/command".
      replace(value === "" && suggestion ? suggestion : completeCommand(value, commands));
    } else if (key.leftArrow) {
      apply(key.ctrl ? wordLeft(current) : { value, cursor: Math.max(0, cursor - 1) });
    } else if (key.rightArrow) {
      apply(key.ctrl ? wordRight(current) : { value, cursor: Math.min(value.length, cursor + 1) });
    } else if (key.home || (key.ctrl && input === "a")) {
      apply(toLineStart(current));
    } else if (key.end || (key.ctrl && input === "e")) {
      apply(toLineEnd(current));
    } else if (key.backspace || key.delete) {
      // A pasted block goes away whole.
      const token = PASTE_TOKEN_BEFORE.exec(value.slice(0, cursor))?.[0];
      apply(token ? { value: value.slice(0, cursor - token.length) + value.slice(cursor), cursor: cursor - token.length } : deleteBack(current));
    } else if (key.ctrl || key.meta || key.escape || !input) {
      return;
    } else {
      handlePaste(input);
    }
    rerender();
  });

  function upHistory(): void {
    const current = state.current;
    if (history.length === 0) return;
    if (current.historyIndex === null) current.draft = current.value;
    current.historyIndex = current.historyIndex === null ? history.length - 1 : Math.max(0, current.historyIndex - 1);
    replace(history[current.historyIndex]);
    rerender();
  }

  function downHistory(): void {
    const current = state.current;
    if (current.historyIndex === null) return;
    current.historyIndex++;
    if (current.historyIndex < history.length) {
      replace(history[current.historyIndex]);
    } else {
      current.historyIndex = null;
      replace(current.draft);
    }
    rerender();
  }

  const { value, cursor, search } = state.current;
  const { stdout } = useStdout();
  const width = liveWidth(stdout.columns) - inset;
  const labelWidth = stringWidth(stripAnsi(label));
  const room = width - labelWidth;
  const ghost = suggestion ? `${suggestion}  (tab)` : null;
  // Suggestions give way on a short terminal: the live area must stay shorter than it.
  const suggestions = value.includes("\n")
    ? []
    : matchingCommands(value, commands).slice(0, Math.min(MAX_SUGGESTIONS, Math.max(0, (stdout.rows || 24) - 10)));

  // With a cursor controller (full screen) the terminal's own cursor sits in the line;
  // without one, the character under the cursor is drawn inverted.
  const cursorController = useContext(CursorContext);
  const cursorLineRef = useRef<DOMElement>(null);

  let rows: ReactNode[];
  let cursorColumn: number;
  if (search) {
    const prefix = `(reverse-i-search)'${search.query}': `;
    const match = search.index >= 0 ? history[search.index] : "";
    cursorColumn = Math.min(stringWidth(prefix) - 3, width - 1);
    rows = [
      <Box key="search" ref={cursorLineRef}>
        <Text>{fitWidth(`${ui.dim(prefix)}${match.replace(/\n/g, " ")}`, width)}</Text>
      </Box>,
    ];
  } else {
    const lines = value.split("\n");
    const at = cursorLine({ value, cursor });
    cursorColumn = 0;
    rows = lines.map((line, i) => {
      const prefix = i === 0 ? label : " ".repeat(labelWidth);
      const isCursorLine = i === at.line;
      const [start, end] = visibleWindow(line.length, isCursorLine ? at.column : 0, room);
      if (isCursorLine) cursorColumn = labelWidth + (start > 0 ? 1 : 0) + stringWidth(line.slice(start, at.column));
      const col = at.column;
      return (
        <Box key={i} ref={isCursorLine ? cursorLineRef : undefined}>
          <Text>
            {prefix}
            {start > 0 ? "…" : ""}
            {isCursorLine ? line.slice(start, col) : line.slice(start, end)}
            {isCursorLine ? (cursorController ? line.slice(col, col + 1) : <Text inverse>{line[col] ?? " "}</Text>) : ""}
            {isCursorLine ? line.slice(col + 1, end) : ""}
            {end < line.length ? "…" : ""}
            {value === "" && ghost ? ui.dim(fitWidth(ghost, Math.max(1, room - 1))) : ""}
          </Text>
        </Box>
      );
    });
  }

  useLayoutEffect(() => {
    if (cursorController && cursorLineRef.current) cursorController.setTarget({ node: cursorLineRef.current, column: cursorColumn });
  });
  useLayoutEffect(() => () => cursorController?.setTarget(null), [cursorController]);

  return (
    <Box flexDirection="column">
      {rows}
      {suggestions.map((name) => (
        <Text key={name}>{ui.dim(fitWidth(`  /${name}`, width))}</Text>
      ))}
    </Box>
  );
}
