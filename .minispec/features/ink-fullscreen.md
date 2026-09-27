# Full-screen Ink chat

## Goal

An opt-in full-screen mode for `runChatInk()`: the conversation fills the terminal and grows upward from a prompt pinned at the bottom, with its own scrolling.

## Context

- Today the history goes to Ink's `<Static>`, i.e. into the terminal's own scrollback; Ink only redraws the live area (reply in progress, spinner, panel, prompt, status bar). Scrolling, the mouse wheel, text selection and what stays on screen after exit are the terminal's.
- `sessionModel.ts` already keeps the history as lines and `lineBuffer.ts` already wraps them to a width, which a viewport can build on.
- Ink 6.8 has `overflow="hidden"` and reports PageUp/PageDown. When its output is as tall as the terminal it redraws the whole frame from the top (clear + write inside synchronized output, `ink.js`). A frame one row shorter with `incrementalRendering` left a stale copy of the prompt on every keystroke in the first spike run (Windows Terminal), so the frame is exactly the terminal's height and incremental rendering stays off.
- The edge-width and blank-line bugs (ADR-014) came from Ink's accounting of what it drew; a full-screen frame that draws every row itself removes that class of bug.
- Builds on `ink-claude-style`: same look, inside the full screen.
- Decisions taken: mouse wheel captured (scrolls; selecting text needs Shift), Ctrl+End returns to the bottom (typing does too), on exit the terminal is left cleared (screen only, scrollback kept), opt-in `fullscreen` option (off by default).

## Changes

- Phase 0 — spike, outside the kit (`spikes/ink-fullscreen.tsx`, not committed): done and accepted on Windows Terminal. No stale copies or noticeable flicker with a frame exactly the terminal's height and no incremental rendering; PageUp/PageDown, the wheel (SGR mouse reports, buttons 64/65) and Ctrl+End all reach Ink; user bars padded in columns stay aligned; resizing re-wraps cleanly; exit leaves the terminal cleared.
- Viewport model (no UI): history wrapped to rows (re-wrapped on resize), offset from the bottom, page up/down by the history area's height, new output while scrolled up keeps the offset and counts new lines.
- Layout: a root exactly `rows` high and one column narrower than the terminal; history area `flexGrow` + `overflow="hidden"`, bottom-aligned; pinned below it the reply in progress, spinner, approval panel, prompt and status bar. The panel takes height from the history instead of pushing it.
- Keys: PageUp/PageDown and the wheel scroll; Ctrl+End or any typed character goes back to the bottom; the status bar shows "↓ N new lines" while scrolled up with new output.
- Terminal lifecycle: enter the alternate screen and mouse reporting on mount; always restore both on exit, Ctrl+C, an error or process exit; then clear the screen and put the cursor at the top.
- `fullscreen?: boolean` in `InkChatOptions`, off by default; captain-whiskers turns it on. `createProgressView()` and `runWizard()` stay inline.
- Tests (viewport, screen frames with `ink-testing-library`); update ADR-014, `architecture.md` and the README.

## Acceptance

- Phase 0: on Windows Terminal, streaming in full screen doesn't flicker noticeably, and PageUp/PageDown, Ctrl+End and the wheel reach the script. If Ctrl+End doesn't, choose a fallback with the user before going on.
- With `fullscreen`, captain-whiskers fills the terminal, the prompt stays on the bottom row area, and the conversation grows upward.
- PageUp/PageDown and the wheel scroll the history; Ctrl+End and typing return to the bottom; output arriving while scrolled up doesn't move the view and shows the new-lines count.
- Resizing the terminal re-wraps the history without broken or duplicated rows.
- Exiting by `/exit`, Ctrl+C or an error always restores the terminal and leaves it cleared.
- Without `fullscreen`, `runChatInk()` behaves exactly as today; `session.log` is unchanged in both modes.
- typecheck, lint, tests and captain-whiskers pass.
