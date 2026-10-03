# Asking the person to choose, and presenting a plan

Issue: [#17](https://github.com/falkenslab/agent-kit/issues/17)

## Goal

The agent asks the person to choose between options (`ask_human`) and, in plan mode, presents its plan to be run (`present_plan`), both in a panel and within the same turn.

## Context

- To ask a choice today the agent ends its turn with a written question: a whole turn more, a free answer to interpret, and an answer to something else now and then.
- In plan mode, the agent can only say "leave plan mode to run it"; the person has to know Shift+Tab or `/plan` and then ask it to start. ADR-023 rejected the SDK's `ExitPlanMode` and left the kit's own exit open.
- Checkpoints ask through `InteractionPort` (`askDecision`, `askManualIntervention`), raced against the response file.

## Changes

- `InteractionPort.askChoice?(prompt, options, { multiple }, signal)`: optional; a host that doesn't implement it gets a fallback through `askDecision` (numbered options, answered by number). Also answerable through the response file.
- `ask_human(question, options, multiple?)`, in the approvals server (not offered in autonomous mode; the plan gate allows it): a panel with the numbered options plus a last "Other" to type a free answer; returns what was chosen.
- `present_plan(plan)`, only in plan mode (the plan gate denies it outside): the plan (markdown) in a panel with *Run it*, *Keep planning* (optional comment) and *Cancel*. Run it: leaves plan mode to the mode before it (`togglePlanMode()`), and the result tells the model it may act now, in the same turn. Keep planning: the comment goes back to the model, the mode stays. Cancel: the mode stays and the model is told to stop.
- Ink chat: a choice panel (single and multiple, with "Other" as a text field) and the plan panel (rendered markdown, scrollable when long, capped to the screen as the approval panel). Plain chat: numbered questions.
- Labels and phrases in the four languages.
- Docs: human-in-the-loop guides (a new page for choices and plans), the interaction port (the optional method), plan mode; ADR-023's consequence about the exit updated.

## Acceptance

- `ask_human` shows its options, returns the chosen one(s) or the free answer, and isn't offered in autonomous mode.
- A host without `askChoice` still gets an answer through the fallback; the response file answers too.
- `present_plan` is denied outside plan mode; Run it leaves plan mode and the agent acts in the same turn; Keep planning returns the comment and keeps the mode.
- Tests for the tools, the fallback and the panels; `verify` passes.
