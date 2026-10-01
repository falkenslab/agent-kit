# The full-screen selection test fails now and then

Issue: [#12](https://github.com/falkenslab/agent-kit/issues/12)

## Problem

`test/tui/ink/fullscreenView.test.tsx`'s "dragging over the history selects it (also while the agent works) and a right-click copies and clears it" fails about one run in four, with nothing changed in between:

```
AssertionError [ERR_ASSERTION]: the highlight still starts on line 28's number
```

It makes `npm test`, `verify` and `prepublishOnly` (so `npm publish`) fail at random, and hides real failures behind "it's the flaky one". Seen repeatedly on 2026-09-30 and 2026-10-01 (kit 0.13.x), on Windows.

## Cause

Not confirmed yet. The likely one: the test reads the row of "line 28" after a fixed 50 ms wait (`settle()`), then presses the mouse on that row. But the full-screen view measures the history's height in an effect after the first render (`measureElement` in `FullscreenSession`, `SessionView.tsx`), and the spinner (`model.startTurn()`) re-renders every 120 ms. When the measurement lands after the rows were read, the rows move, the press falls on another row, and the highlight doesn't start on "28". The other `settle()`-based waits in the file could fail the same way.

## Solution

- Confirm the cause: log the frame and the computed cell when it fails, or run the test in a loop.
- Wait for the condition instead of a fixed time: a helper that polls `lastFrame()` until the layout is stable (or until a given text is where expected), with a timeout, and use it before reading positions and after each mouse report.
- If the view itself can mis-place a press during that first layout (not only the test), fix the view: a real person could click in that window too.

## Verification

- The test passes 50 runs in a row (`for i in $(seq 50); do npx tsx --test test/tui/ink/fullscreenView.test.tsx || break; done`).
- `verify` passes.
