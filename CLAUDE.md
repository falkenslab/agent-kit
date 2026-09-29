# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@falkenslab/agent-kit` is generic, domain-agnostic scaffolding for building an agent on top of `@anthropic-ai/claude-agent-sdk`. What it is, its architecture, stack, conventions and design decisions (including the SDK behavior confirmed empirically) live in `.minispec/` (see below); this file keeps only how to work on it.

## Commands

```
npm run build       # tsc — compiles src/ to dist/ (also emits .d.ts)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # tsx --test "test/**/*.test.ts" — runs everything under test/
npm run docs:install  # once: the documentation site's own dependencies (docs/)
npm run docs:start    # the documentation site, live, at http://localhost:3000/agent-kit/
npm run docs:build    # build it (fails on broken links); the API reference is generated from src/
```

The documentation site (Docusaurus, `docs/`) is part of every change: a change visible to agents updates its guides in `docs/content/` in the same change, and the public API's doc comments feed its API reference.

Run a single test file directly instead of through the npm script filter:
```
npx tsx --test test/tui/promptErrors.test.ts
```

There is no separate "watch" script. Tests use Node's built-in test runner (`node:test` + `node:assert/strict`), executed directly against TypeScript source via `tsx` (no compile step needed for tests).

## Before changing code

Read the doc comments in `src/core/agentSpec.ts` and `src/core/session.ts` before changing either, and all three subagent gates together before touching subagent wiring: comments marked "confirmed empirically" encode real SDK behavior that isn't always documented. The decisions behind them are in `.minispec/decisions/`.

## MiniSpec (read first)

Before writing any code, read `.minispec/README.md` and follow its reading contract. As a minimum, always read `.minispec/core/project.md`, `.minispec/core/conventions.md` and `.minispec/core/principles.md`; read the rest of `.minispec/` only on demand (architecture, stack, glossary, the relevant feature or ADR). Keep features small and don't write redundant documentation. When a design decision changes, update its ADR (or write a new one) and `.minispec/core/architecture.md`.
