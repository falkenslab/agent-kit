# ADR-001: `core/` never assumes a terminal

## Decision

`src/` splits along one line: `src/core/` never touches `console.*`, `process.stdout` or `readline`; `src/tui/` is the only place that assumes a terminal. Only `src/index.ts` imports from both, and nothing in `core/` imports from `tui/`.

## Motivation

The same sessions and approvals run in non-terminal hosts: an Electron main process (confirmed empirically in a real consuming desktop app, answering approvals only through `<runDir>/approval-response.txt`), a server, or a sidecar for a host without Node (a Tauri 2 app).

## Consequences

A capability that needs a human at a keyboard (prompts, colors, `process.exit`) is split: pure logic in `core/`, the terminal wrapper in `tui/` (auth is the model, ADR-009). A non-terminal host replaces `src/tui/` entirely with its own UI. `humanInput.ts` still reads a TTY when there is one; a UI-agnostic interaction port is the planned next step (feature `ink-ui`).
