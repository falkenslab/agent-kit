# The chat doesn't show English tool results under translated labels

Issue: [#79](https://github.com/falkenslab/agent-kit/issues/79)

## Goal

What the chat shows under a tool call reads in the person's language, while the result the model gets stays as it is.

## Context

- The chat shows the first line of each tool's result under its label (`resultLine()` and `resultSummary()` in `src/tui/ink/toolGroup.ts`). For the kit's tools and the extensions' that text is English, written for the model, so a Spanish chat reads "Leyendo el índice de la base de conocimiento / ⎿ The knowledge base is empty.", and moodle-mcp's "There is no Moodle session, or it expired…". Seen in miyagi.
- Labels are already translated (`toolLabels`: `label`, `phrase`; manifests' `labels`). An agent can already change result lines with the Ink chat's `formatResult`, but nothing in the kit uses it.

## Changes

- A label may carry a **`result(output)`**, in the person's language, shown instead of the raw first line (`ToolLabel.result`, and `result` in a manifest's `labels` per language, a short fixed text).
- The kit's own tools whose label already says what happened (knowledge reads, sources, time) show no result line unless it failed or the group is expanded, or give a `result` where the outcome matters ("empty", "not found").
- Extensions' tools without a `result`: the raw line only when expanded, or on error.
- The plain chat and the chat controller's state (web views) the same.
- In the schema, the reference and agent-kit-catalog's known fields (`labels[…].result`).
- Docs (English and Spanish): Tool labels, Writing an extension (labels), the manifest reference.

## Acceptance

- A Spanish chat reading an empty knowledge base shows no English line under its label.
- An extension's tool with a `result` label shows it in the person's language; one without shows its raw result only when expanded or failed.
- The model's tool results are unchanged (transcript).
- Tests; `verify` passes.
