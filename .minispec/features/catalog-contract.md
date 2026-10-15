# The marketplace catalog's contract in the kit, and a generator any marketplace can run

Issue: [#60](https://github.com/falkenslab/agent-kit/issues/60)

## Goal

The format of a marketplace's `catalog.json` and of `metadata["agent-kit"]` in `plugin.json` is defined once, in agent-kit, and any marketplace builds and checks its catalog with one `npx` command, so what's written and what's read never drift apart.

## Context

- #59 defined an extension's look (`metadata["agent-kit"].catalog`: `logo`, `banner`) and its topics; the kit's catalog reads `marketplace.json` and each `plugin.json` from the marketplace's copy (extensionCatalog.ts), not `catalog.json`.
- `catalog.json` is written by a script in each marketplace: today `scripts/build-catalog.mjs` in falkenslab/agent-kit-extensions, already generic (the repository from `--repo`, `GITHUB_REPOSITORY`, the `origin` remote or the plugins' `repository`; the branch from `--branch`, else `main`; versions checked against the entries; topics merged; images as `raw.githubusercontent.com` URLs). Its readers are the marketplace's public page and anyone outside an agent.
- `metadata["agent-kit"]`'s fields (`kit`, `provides`, `requires`, `needs`, `readOnlyTools`, `labels`, `help`, `catalog`) are only described in the docs and checked by `readExternalManifest()` as it reads them.
- `@falkenslab/agent-kit` has no `bin`, and its dependencies (the Agent SDK, ink) are heavy for a CI step.

## Changes

- JSON Schemas shipped in the package: `catalog.json`, and `metadata["agent-kit"]` in `plugin.json`; tests check the kit's own plugins, the shipyard and a generated catalog against them.
- The generator, dependency-free, runnable with `npx` without installing an agent: a small package of its own (e.g. `@falkenslab/build-catalog`, `--check` to fail on a stale file), starting from agent-kit-extensions' script; it validates what it writes against the schema.
- The catalog fits any Claude Code marketplace: only `logo` and `banner` are agent-kit's.
- Docs: `capabilities/extensions.md` (the catalog file, the schemas, the generator).

## Acceptance

- `npx <generator> --check` in agent-kit-extensions passes, and fails on a stale `catalog.json` or one that doesn't fit the schema.
- A `plugin.json` whose `metadata["agent-kit"]` doesn't fit the schema fails a test in the kit.
- agent-kit-extensions drops its own copy of the script.
- `verify` passes.
