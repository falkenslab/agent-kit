# The wizard's last step stays unanswered on screen

Issue: [#7](https://github.com/falkenslab/agent-kit/issues/7)

## Problem

When `runWizard()` finishes on a TTY, its last step isn't shown as answered: the terminal keeps its live frame ("? Create instructions.md…? y/N") instead of the "✔ … No" line every earlier step gets. A one-question wizard (teacher-agent's menus) leaves its only question as "? … Y/n". Seen in teacher-agent's `init` with kit 0.13.0.

## Cause

`Wizard.answer()` (`src/tui/ink/wizard.tsx`) calls `setDone()` and, on the last step, `onDone(next)` and `exit()` in the same handler: Ink unmounts before rendering the update, so the new `<Static>` item (the ✔ line) is never written.

## Solution

- Exit after that render: an effect that calls `exit()` once `index >= steps.length`, so the ✔ line is committed first. Ctrl+C keeps exiting at once.
- A test (ink-testing-library) that the last answer's ✔ line is in the output.

## Verification

- A three-step wizard and a one-step wizard in a TTY: every step ends as a ✔ line, the last one included; Ctrl+C still rejects with `ExitPromptError`.
- teacher-agent's `init` shows "✔ … instructions.md…? No" as its last line.
- `verify` passes.
