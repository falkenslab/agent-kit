# Stack

## Runtime

- Node.js ≥ 20, ESM, TypeScript with `NodeNext` resolution.
- `@anthropic-ai/claude-agent-sdk` — a regular dependency; its main types are re-exported (ADR-011).
- `zod` — MCP tool schemas.
- `picocolors`, `@inquirer/prompts` — terminal only (`src/tui/`).
- `ink` 6, `react` 19, `@inkjs/ui` — the Ink UI (`src/tui/ink/`, ADR-014); `.tsx` with `jsx: react-jsx`.

## Tooling

- `tsc` to `dist/` (with `.d.ts`); `prepare` builds on install.
- Tests: `node:test` + `node:assert/strict`, run with `tsx --test` against the source; Ink components with `ink-testing-library`.
- ESLint with `typescript-eslint` (ignores `examples/`).

## Distribution (ADR-017)

Published to npm as `@falkenslab/agent-kit` (MIT); versions up to 0.10.0 exist only as git tags. `examples/captain-whiskers` depends on it with `file:../..`.
