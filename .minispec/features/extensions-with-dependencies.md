# Installed extensions with dependencies: read-only hints, a cheaper hash, an example

Issue: [#53](https://github.com/falkenslab/agent-kit/issues/53)

## Goal

An installed extension that bundles dependencies (a server built with esbuild, `node_modules`) is cheap to check, needn't repeat which tools only read, and has an example to copy in Captain Whiskers' shipyard.

## Context

- The installed folder's SHA-256 is computed on every session start; with `node_modules` (e.g. `playwright-core`: hundreds of files, several MB) it may cost seconds. Not measured.
- Plan mode lets through only the tools known to only read: an installed extension lists them in its manifest (`agent-kit.readOnlyTools`). An MCP server can already say so per tool (`annotations.readOnlyHint`), as moodle-mcp will; declaring both is repetition that drifts.
- The annotation comes from the server itself, the code the kit trusts least: it can't outrank the manifest.
- The only installed example, the jokebook, has no dependencies and no build: nothing shows how to build, bundle and publish one that has.
- Depends on `extension-data-and-link.md` for the example's data folder.

## Changes

- Measure the hash with a real `node_modules`; if it costs, cache it per file (path, size, mtime) in the scope and rehash only what changed. The check stays on every session.
- `readOnlyHint`: when the manifest lists no `readOnlyTools`, the tools the server marks `readOnlyHint: true` count as read-only (read when the session lists its tools); the manifest's list, when present, wins. Record the trust decision in ADR-025.
- An example extension in the shipyard with a dependency and a build: TypeScript in `src/`, esbuild to `server/index.mjs` with one external dependency in `node_modules`, `needs: ["node"]`, a file in `${CLAUDE_PLUGIN_DATA}`, published in the marketplace as a zip with its `sha256`. Light (no browser).
- Docs: `capabilities/extensions.md` (an extension with dependencies, step by step; read-only tools), `examples/captain-whiskers.md`.

## Acceptance

- Opening a session with an installed extension carrying `playwright-core` adds under 200 ms for the hash once cached (measured, before and after in the issue).
- An installed server marking a tool `readOnlyHint: true`, with no `readOnlyTools` in its manifest, runs it in plan mode; one the manifest omits while listing others is denied.
- The captain installs the example from the shipyard, and it works and keeps its data across sessions.
- `verify` passes.
