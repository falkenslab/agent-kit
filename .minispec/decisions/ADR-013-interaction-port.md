# ADR-013: Human-in-the-loop checkpoints ask through an interaction port

## Decision

`askForDecision()` and `askForManualIntervention()` race the response file against an `InteractionPort` (`core/interaction.ts`: `askDecision`, `askManualIntervention`, `notify`), installed with `setInteractionPort()`. The terminal port (`tui/terminalInteraction.ts`, readline plus the chat's shared interface) is installed by `src/index.ts` on import, so nothing changes for existing consumers.

## Motivation

The keyboard side was the one place in `core/` that read a TTY and printed (ADR-001). An Ink UI, an Electron window or a test need to show the checkpoint their own way without a second stdin reader fighting the chat's (ADR-004). Rejected: a port per call site (three checkpoints, one contract) and a default port in `core/` (it would pull the terminal back in).

## Consequences

`core/` no longer touches the terminal. A port that can't ask returns a never-resolving promise so the file wins; it gets an `AbortSignal` once the race settles and must leave its UI usable. The response file stays the public contract. The port is process-wide state: one UI per process. Importing modules deep (tests) gets no port, so the file alone answers.
