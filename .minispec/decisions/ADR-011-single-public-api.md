# ADR-011: `src/index.ts` is the whole public API

## Decision

Everything consumers use is exported from `src/index.ts`, including re-exports of SDK types (`Options`, `McpServerConfig`, `AgentDefinition`). Consumers import only from `@falkenslab/agent-kit`, never deep paths.

## Motivation

A consumer that only calls `buildSessionOptions()`/`runQuery()` shouldn't need the SDK in its own `package.json`, and deep imports would freeze the internal layout.

## Consequences

Adding a symbol means adding it to `index.ts` (`add-export` skill). Internal helpers exported for tests (like `drainTurn()`) stay out of it. API changes are checked against the consumers (`check-consumers` skill) while the version is 0.x.
