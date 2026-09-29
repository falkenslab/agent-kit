# Technical documentation site

Issue: [#3](https://github.com/falkenslab/agent-kit/issues/3)

## Goal

Publish English technical documentation for building agents with `@falkenslab/agent-kit`, a Docusaurus site in `docs/` deployed to GitHub Pages.

## Context

- Today a developer learns the kit from the README (capabilities, a minimal agent), captain-whiskers' code and the doc comments in `src/`. `.minispec/` explains design decisions for whoever works *on* the kit, not how to build *with* it.
- The public API is everything exported from `src/index.ts` (ADR-011): `AgentSpec`/`BaseSessionConfig`, `buildSessionOptions()`, `runQuery()` and `AgentEvent`, the hooks and gates, the interaction port, the knowledge base, languages (`setLanguage()`...), runs (`createRunStore()`, `listRuns()`...), and the terminal UI (`runChatInk()`, `runChatTui()`, `createProgressView()`, `runWizard()`, `ensureClaudeAuth()`). Its doc comments are thorough but only readable in an editor.
- `docs/` only holds `assets/captain-whiskers.png`, used by the README. There is no `.github/workflows/`.
- The package publishes only `dist/` and `assets/` (`files`), so a site under `docs/` doesn't reach npm.

## Changes

- Docusaurus (latest, TypeScript config) in `docs/` as its own npm project (its own `package.json`, not a dependency of the kit), with the existing `docs/assets/` kept where the README expects it.
- Guides, written by hand, short, each with runnable code:
  - Getting started: install, Claude authentication, the minimal agent, running it.
  - Concepts: `AgentSpec`, modes and the mode switch, the two layers (core without a terminal, the terminal UI).
  - Human in the loop: step gate, approval tool, manual intervention, the response file, a custom `InteractionPort` for a desktop host.
  - Security: file scope, subagent gates, MCP permissions, `disallowedTools`, what the transcript redacts.
  - Knowledge base and sources.
  - Subagents.
  - Skills, commands and plugins; `skills` and `settingSources`.
  - The terminal UI: Ink chat (full screen, header, suggestions, tool phrases), plain chat, progress view, wizard.
  - Runs and resuming (`runsDir`, `--continue`, `/resume`).
  - Languages (`--language`, `language`, the reply line and its limits).
  - Events and hosts without a terminal: `runQuery()`, `AgentEvent`, an Electron-style example.
  - Captain Whiskers as a walkthrough.
- API reference generated from the doc comments of `src/index.ts`'s exports (TypeDoc with `docusaurus-plugin-typedoc`), rebuilt on every site build so it never drifts from the code.
- Design notes: link to `.minispec/decisions/` on GitHub rather than copying the ADRs.
- A GitHub Actions workflow that builds the site on pushes to `main` touching `docs/` or `src/`, and deploys it to GitHub Pages (`https://falkenslab.github.io/agent-kit/`); on pull requests it only builds, so broken links fail the check.
- Root `package.json` scripts: `docs:start` and `docs:build` (running the site's own). ESLint keeps ignoring `docs/`.
- README: a "Documentation" link to the site; its long sections can then shrink to a summary.
- `verify` skill: build the site too when `docs/` or public doc comments changed. `release` skill: note that the site redeploys from `main`, no manual step.
- An ADR: the site as the developer documentation, generated reference plus hand-written guides, GitHub Pages.

## Acceptance

- `npm run docs:build` builds the site with no broken links, and `npm run docs:start` serves it locally.
- The site is live on GitHub Pages after a push to `main`, with the guides above and an API reference covering every export of `src/index.ts`.
- Following "Getting started" on a clean machine yields a running agent.
- `npm pack --dry-run` lists nothing from `docs/` beyond what `files` already allows.
- `verify` passes.
