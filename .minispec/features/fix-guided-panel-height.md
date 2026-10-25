# The guided gate's panel can be taller than the screen

Issue: [#84](https://github.com/falkenslab/agent-kit/issues/84)

## Problem

- In the full-screen chat, the guided gate's panel (#74, #76) for `mcp__moodle__set_rubric` shows the whole rubric as indented JSON; at 120×42 it ends in the middle of it, and its options (yes / no / no, never) fall below the last row: the person can't see what to answer, and the session looks hung.
- Any tool with long parameters (a rubric, a page's HTML, a GIFT file) does the same.

## Cause

- The panel's preview is capped by `previewLines()` (#9), leaving `PANEL_RESERVED_ROWS` for the rest of the screen, counted for a decision's panel (three options). A choice panel has its options, "Other" and a line of keys: with the guided gate's five answers, four rows more than reserved.
- The gate shows the parameters as indented JSON even when the tool's label already says what it does.

## Solution

- `panelReservedRows()` (`src/tui/ink/SessionView.tsx`): the rows a panel needs besides its preview, by its kind (decision, choice with its options, text, manual), so the cap leaves room for every option.
- The guided gate shows a labelled tool's parameters as one compact line, cut at 300 characters; without a label, the indented JSON as before.
- Docs (English and Spanish): Approvals.

## Verification

- A test at 110×34 with a rubric's parameters: the preview and the panel's frame with all five options fit.
- The guided gate's test: a labelled tool's parameters in one line.
- `verify` passes.
