# ADR-015: Opt-in full-screen Ink chat with its own scrolling

## Decision

`runChatInk()` takes `fullscreen: true` to draw the whole terminal in its alternate screen: the history in a scrollable view above the live area, the prompt pinned at the bottom. Off by default; the inline mode (history in the terminal's scrollback, ADR-014) stays as is.

## Motivation

A prompt that is always at the bottom and a conversation that grows upward, with its own scrolling, is the layout of the Claude Code CLI the Ink UI is converging on (feature `ink-claude-style`). A spike on Windows Terminal validated it before building it (feature `ink-fullscreen`, phase 0).

## Consequences

- The frame is exactly the terminal's height and one column narrower, with incremental rendering off: Ink then redraws it whole from the top (clear plus write, inside synchronized output) instead of relative to where it thinks the cursor is. A frame one row shorter left a stale copy of the prompt on every keystroke on Windows Terminal (confirmed empirically in the spike).
- The history is not in `<Static>` but rendered from the session model's lines, wrapped to rows with a cache that only wraps what was added (`fullscreen.ts`). The view is anchored to a row, not to a distance from the bottom, so output arriving while scrolled up doesn't move it; a width change re-wraps and goes back to the bottom.
- Mouse reporting is on so the wheel scrolls: selecting text needs Shift, and mouse reports must never reach an input as text (`isMouseReport()`).
- Keys: PageUp/PageDown and the wheel scroll, Ctrl+End or typing returns to the bottom. On exit the terminal leaves the alternate screen and is cleared (screen only, scrollback kept), always: `enterFullscreen()` also restores on process exit.
- `createProgressView()` and `runWizard()` stay inline. `session.log` is the same in both modes.
