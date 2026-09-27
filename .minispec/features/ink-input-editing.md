# Richer prompt editing in the Ink chat

## Goal

Make the Ink chat's prompt edit like a good shell or Claude Code: pasted blocks, multi-line prompts, word shortcuts, history search and editable queued messages.

## Context

- `PromptInput.tsx` is a one-line editor: ↑/↓ history, Tab completion and suggestion, Ctrl+U, Ctrl+A/E, Home/End, ←/→, Backspace. A paste arrives as one chunk and its line breaks become spaces.
- Lines sent during a turn wait in `ChatInputSnapshot.queued` and can't be changed once queued.
- Ink has no bracketed paste; a paste is one chunk with line breaks, which typing never produces (Enter comes alone).

## Changes

- Paste: a chunk with line breaks (or longer than a threshold) is a paste; long ones show as `[Pasted text #N +L lines]` in the prompt and are expanded when sent; consecutive chunks of the same paste merge.
- Multi-line: `\` + Enter (and Ctrl+J where the terminal tells it apart) inserts a line break; the prompt grows in height, ↑/↓ move between lines and only reach the history from the first or last line; the cursor follows (full screen) or is drawn (inline).
- Shortcuts: Ctrl+W deletes the previous word, Ctrl+K to the end of the line, Ctrl+←/→ jump by word.
- Ctrl+R: reverse search in the history, shown as `(reverse-i-search) 'text': match`; Enter takes the match, Esc cancels.
- Queued messages: ↑ on an empty prompt with a queue takes the last queued line back into the prompt to edit or drop.

## Acceptance

- Pasting several lines in captain-whiskers shows one placeholder and sends the whole text; `\` + Enter writes a second line; Ctrl+W/K, Ctrl+←/→ and Ctrl+R work; a queued line can be taken back with ↑.
- `session.log` gets the expanded text of what is sent.
- Tests for each behavior with `ink-testing-library`.
- typecheck, lint, tests and captain-whiskers pass.
