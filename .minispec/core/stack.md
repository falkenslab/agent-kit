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

## Distribution (ADR-012)

Not on npm. Consumers today:

- `student-agent` — git dependency on a tag (`git+https://github.com/falkenslab/agent-kit.git#vX.Y.Z`).
- `teacher-agent` — `npm pack` tarball of a tag, attached to a teacher-agent release.
- `examples/captain-whiskers` — `file:../..`.
