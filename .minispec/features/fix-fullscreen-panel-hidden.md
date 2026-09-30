# The approval panel hidden in a short full-screen terminal

Issue: [#9](https://github.com/falkenslab/agent-kit/issues/9)

## Problem

In the full-screen Ink chat, when an approval panel (or any tall live area) appears, the history doesn't give up its rows: history and panel overlap, and in a short terminal the panel isn't visible at all. Seen from teacher-agent (kit 0.12, 2026-09-29): at 110×34 the approval panel never showed, the session looked hung, and after ~10 minutes the approval timed out and was taken as a rejection; at 40 rows the history rows overlapped the panel. At 130×48 and taller it rendered fine. `SessionView.tsx`'s full-screen layout hasn't changed in that part since (0.13.1): to reproduce on the current version before fixing.

## Cause

To confirm. In `FullscreenView` (`src/tui/ink/SessionView.tsx`) the history box (`flexGrow={1} flexShrink={1} overflow="hidden"`) renders `wrapped.rows.slice(start, end)`, where the window is computed from `historyHeight`, the height measured on the previous render. When the live area grows, the history still renders the old number of rows for that frame; if Yoga doesn't shrink a column whose `Text` children add up to more than the room left (no `minHeight={0}`), the box keeps its height, the whole view is taller than `rows`, and Ink draws the overflow over the panel or off the bottom. A tall panel in a short terminal (`previewLines()` caps it at `rows - 12` lines) leaves the history with fewer rows than it renders.

## Solution

- Reproduce first with ink-testing-library: a `FullscreenView` at 110×34 with a long history and an approval panel of ~20 lines; the panel's options must be in the last frame.
- Compute the history's window from the room actually left (rows − header − live area's measured height), not from last frame's history height, or re-measure after the live area changes; and/or give the history box `minHeight={0}` so it can shrink below its content.
- Make sure the panel's options and the status bar always fit: `previewLines()` should cap the panel with the header and status bar counted.

## Verification

- The new test passes at 110×34 and at 80×24; the existing full-screen tests still pass.
- In captain-whiskers at 110×34 and 80×24, an approval with a long summary shows its options and can be answered; the history scrolls back with PageUp afterwards.
- `verify` passes.
