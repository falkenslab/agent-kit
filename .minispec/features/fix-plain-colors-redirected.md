# --plain output redirected to a file on Windows is full of ANSI codes

Issue: [#95](https://github.com/falkenslab/agent-kit/issues/95)

## Problem

- An agent run headless with its output redirected (`--plain --headless ... > run.log`, as CI or a scheduled task does) writes a log full of escape codes on Windows.
- The streamed text gets one color code per chunk, splitting words: `Empiezo rev[39m[96misando las[39m[96m fuentes`.

## Cause

- `paint()` (`src/tui/theme.ts`) and the helpers in `src/tui/ui.ts` color whenever `pc.isColorSupported` is true, and picocolors makes it true on `win32` whatever stdout is (it checks `isatty(1)` only elsewhere).
- The streamed text is painted chunk by chunk as it arrives.

## Solution

- Color is decided once: on when stdout is a terminal, honoring `NO_COLOR` (off) and `FORCE_COLOR` (on); everything the terminal UI paints follows that decision (`pc.createColors(enabled)`).
- The streamed text is painted per line, not per chunk, so a colored terminal gets fewer codes too.
- Docs (English and Spanish): the plain chat, themes.

## Verification

- Tests: with stdout not a terminal nothing is colored on any platform, `FORCE_COLOR` turns it on, `NO_COLOR` off; streamed text in chunks gets one code per line.
- On Windows, a real `--plain` run redirected to a file has no escape codes.
- `verify` passes.
