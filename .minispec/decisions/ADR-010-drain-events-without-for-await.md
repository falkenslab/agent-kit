# ADR-010: Drain session events with `.next()`, never `for await` + `break`

## Decision

`drainTurn()` consumes `run.events` with manual `.next()` calls until `turn-end`.

## Motivation

`run.events` is one generator spanning the whole multi-turn session. Breaking a `for await...of` loop calls its `.return()` and closes it for good, silently dropping every turn after the first.

## Consequences

Any new UI (a different chat loop, an Ink renderer) reuses `drainTurn()` or the same pattern. `test/tui/chatTui.test.ts` guards it.
