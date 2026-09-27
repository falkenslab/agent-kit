import { useReducer, useRef } from "react";
import { Box, Text, useInput } from "ink";
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

export interface PromptInputProps {
  label: string;
  /** Earlier lines, oldest first, for ↑/↓. */
  history: readonly string[];
  /** Slash command names (without "/") for suggestions and Tab completion. */
  commands: readonly string[];
  onSubmit(line: string): void;
  /** Ctrl+D on an empty line. */
  onExit(): void;
}

/**
 * A one-line prompt with ↑/↓ history and "/command" completion. Written here rather than
 * taken from @inkjs/ui because its TextInput is uncontrolled: history needs to replace the
 * value. Backspace also arrives as `delete` on Windows terminals, so both erase backwards.
 */
export function PromptInput({ label, history, commands, onSubmit, onExit }: PromptInputProps) {
  // Kept in a ref, not in state: two keystrokes can arrive before React re-renders, and a
  // handler reading state would apply the second one to a stale value.
  const state = useRef({ value: "", cursor: 0, historyIndex: null as number | null, draft: "" });
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  function replace(next: string): void {
    state.current.value = next;
    state.current.cursor = next.length;
  }

  useInput((input, key) => {
    const current = state.current;
    const { value, cursor } = current;
    if (key.return) {
      replace("");
      current.historyIndex = null;
      rerender();
      onSubmit(value);
      return;
    }
    if (key.ctrl && input === "d") {
      if (value === "") onExit();
      return;
    }
    if (key.upArrow) {
      if (history.length === 0) return;
      if (current.historyIndex === null) current.draft = value;
      current.historyIndex = current.historyIndex === null ? history.length - 1 : Math.max(0, current.historyIndex - 1);
      replace(history[current.historyIndex]);
    } else if (key.downArrow) {
      if (current.historyIndex === null) return;
      current.historyIndex++;
      if (current.historyIndex < history.length) {
        replace(history[current.historyIndex]);
      } else {
        current.historyIndex = null;
        replace(current.draft);
      }
    } else if (key.tab) {
      replace(completeCommand(value, commands));
    } else if (key.leftArrow) {
      current.cursor = Math.max(0, cursor - 1);
    } else if (key.rightArrow) {
      current.cursor = Math.min(value.length, cursor + 1);
    } else if (key.home || (key.ctrl && input === "a")) {
      current.cursor = 0;
    } else if (key.end || (key.ctrl && input === "e")) {
      current.cursor = value.length;
    } else if (key.backspace || key.delete) {
      if (cursor === 0) return;
      current.value = value.slice(0, cursor - 1) + value.slice(cursor);
      current.cursor = cursor - 1;
    } else if (key.ctrl || key.meta || key.escape || !input) {
      return;
    } else {
      // A paste arrives as one chunk; its line breaks would otherwise land inside the line.
      const text = input.replace(/\r?\n|\r/g, " ");
      current.value = value.slice(0, cursor) + text + value.slice(cursor);
      current.cursor = cursor + text.length;
    }
    rerender();
  });

  const { value, cursor } = state.current;
  const suggestions = matchingCommands(value, commands).slice(0, MAX_SUGGESTIONS);
  const atCursor = value[cursor] ?? " ";
  return (
    <Box flexDirection="column">
      <Text>
        {label}
        {value.slice(0, cursor)}
        <Text inverse>{atCursor}</Text>
        {value.slice(cursor + 1)}
      </Text>
      {suggestions.map((name) => (
        <Text key={name}>{ui.dim(`  /${name}`)}</Text>
      ))}
    </Box>
  );
}
