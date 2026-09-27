# Text selection in the full-screen chat

## Goal

Select text in the full-screen chat by dragging, without Shift and also while the agent is working, and copy it to the clipboard.

## Context

- Full screen captures mouse reports (`?1000h`, SGR) so the wheel scrolls the history (ADR-015); the terminal's own selection then needs Shift.
- While a turn runs, the spinner makes Ink redraw the whole frame (clear plus write) about 12 times a second, and the terminal drops its selection on every redraw.
- Wheel scrolling, selecting without Shift and selecting while the agent works can only all hold if the chat selects text itself, as tmux or vim do.
- The history is already a list of rows wrapped to the width (`fullscreen.ts`), so a selection can be kept as row and column positions, which survive redraws and scrolling.

## Changes

- Mouse: button-event tracking (`?1002h`) on top of the current reports, to get drags; `fullscreen.ts` parses press, drag and release with their cell.
- Selection in the history area: press starts it, drag extends it, release copies; a click without dragging clears it. Anchored to history rows and columns, so it stays put through redraws, new output and scrolling.
- Highlight drawn by the view itself (inverse video over the selected columns, `slice-ansi`), on every frame.
- Copy with OSC 52 (`ESC ] 52 ; c ; base64 BEL`), which Windows Terminal supports; the status bar says how many characters were copied.
- Out of scope for now: selecting in the header or the live area, double-click word selection.

## Acceptance

- In captain-whiskers, dragging over the conversation highlights it without Shift, also while `Thinking…` is on screen, and the text lands in the clipboard on release.
- The wheel still scrolls, and a highlight stays on the same text after scrolling or new output.
- Tests: mouse report parsing (press, drag, release), selection to text (wrapped rows, wide characters), the highlight in a screen frame.
- typecheck, lint, tests and captain-whiskers pass.
