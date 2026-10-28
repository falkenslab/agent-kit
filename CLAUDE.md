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

The documentation site (Docusaurus, `docs/`) is part of every change: a change visible to agents updates its guides in `docs/content/` in the same change, and the public API's doc comments feed its API reference. After any change to `src/`, `examples/captain-whiskers/`, `extensions/` or the root scripts, and before committing it, run the `update-docs` skill: a change is not done until its documentation is.

Run a single test file directly instead of through the npm script filter:
```
npx tsx --test test/tui/promptErrors.test.ts
```

There is no separate "watch" script. Tests use Node's built-in test runner (`node:test` + `node:assert/strict`), executed directly against TypeScript source via `tsx` (no compile step needed for tests).

## Releasing

The user-level `release` skill does the release. What agent-kit adds to it:

- **The owner publishes to npm** (`npm publish`, and `npm login` first when it has expired): hand them the command.
- **Documentation versions**: the site keeps only the latest release and `/next`. After `npm run docs:version -- X.Y.Z`, remove the previous snapshot (`git rm -rq docs/versioned_docs/version-<previous> docs/versioned_sidebars/version-<previous>-sidebars.json`, leaving `docs/versions.json` with `X.Y.Z` alone), and snapshot the Spanish translation too, from `docs/`: `cp -r i18n/es/docusaurus-plugin-content-docs/current i18n/es/docusaurus-plugin-content-docs/version-X.Y.Z`, `cp i18n/es/docusaurus-plugin-content-docs/current.json i18n/es/docusaurus-plugin-content-docs/version-X.Y.Z.json`, the previous release's Spanish copy removed, and in `version-X.Y.Z.json` the `version.label` message set to `X.Y.Z`.
- **Captain Whiskers' version** (`examples/captain-whiskers/package.json`): bump it by the same rules when `git diff <last tag>..HEAD --stat -- examples/captain-whiskers` shows a change of his; otherwise keep it.
- **Captain Whiskers' installer**, built from the release commit and attached to the GitHub release: in `examples/captain-whiskers/desktop/`, `npm run build` then `npm run dist`, both with `ELECTRON_RUN_AS_NODE` unset (VS Code's terminal sets it). Before uploading, check `dist/win-unpacked/resources/app.asar.unpacked/node_modules/@anthropic-ai/claude-agent-sdk-win32-x64/claude.exe` exists and that the kit and the captain inside `app.asar` say the new versions (`node -e 'const p=require("path"), a=require("./node_modules/@electron/asar/lib/asar.js"), r="dist/win-unpacked/resources/app.asar", v=(...x)=>JSON.parse(a.extractFile(r,p.join(...x))).version; console.log(v("node_modules","@falkenslab","agent-kit","package.json"), v("package.json"))'`). Upload it as `Captain-Whiskers-Setup-<captain version>.exe` (`gh release upload vX.Y.Z <file>`), and say in the notes: "Captain Whiskers <version>, the example agent built on agent-kit X.Y.Z, as a Windows app: download the installer. It's unsigned, so SmartScreen warns about it; on first start it asks you to sign in with your Claude account (or for an API key), and it keeps everything in `~/.captain-whiskers`." If the build bumps `desktop/package.json`'s version, commit it.
- **The catalog generator** (`packages/agent-kit-catalog`, published as `@falkenslab/agent-kit-catalog`): when it or `schemas/` changed since the last tag, bump its own version and publish it too (`cd packages/agent-kit-catalog && npm publish`).

## Before changing code

Read the doc comments in `src/core/agentSpec.ts` and `src/core/session.ts` before changing either, and all three subagent gates together before touching subagent wiring: comments marked "confirmed empirically" encode real SDK behavior that isn't always documented. The decisions behind them are in `.minispec/decisions/`.

## MiniSpec (read first)

Before writing any code, read `.minispec/README.md` and follow its reading contract. As a minimum, always read `.minispec/core/project.md`, `.minispec/core/conventions.md` and `.minispec/core/principles.md`; read the rest of `.minispec/` only on demand (architecture, stack, glossary, the relevant feature or ADR). Keep features small and don't write redundant documentation. When a design decision changes, update its ADR (or write a new one) and `.minispec/core/architecture.md`.
