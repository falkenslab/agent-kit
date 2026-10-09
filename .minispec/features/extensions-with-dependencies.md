# Installed extensions' read-only tools from their servers' hints

Issue: [#53](https://github.com/falkenslab/agent-kit/issues/53)

## Goal

Plan mode lets through an installed extension's tools that its server marks `readOnlyHint`, so an extension built on an MCP server that already says which tools only read (moodle-mcp) needn't repeat the list in its manifest.

## Context

- Plan mode lets through only the tools known to only read: an installed extension lists them in its manifest (`agent-kit.readOnlyTools`); without a list, plan mode denies them all.
- An MCP server says it per tool (`annotations.readOnlyHint`), as moodle-mcp does. Repeating the list in the manifest drifts each time the server gains a tool: a new reading tool is denied in plan mode, or a tool that started writing is still let through.
- The SDK gives them: `mcpServerStatus()` lists a connected server's tools with `annotations.readOnly`. The plan gate's list can already change while the session runs (#49).
- The annotation comes from the server itself, the code the kit trusts least: it can't outrank the manifest.
- Measured on 9 October 2026 with moodle-mcp: hashing what such an extension installs (its bundled `dist/`, 4 MB, and `playwright-core`, 14 MB) takes about 240 ms per session; only a development `node_modules` (96 MB, 6418 files) takes seconds. No hash cache needed; the docs say to install the package, not a development folder (and `--link` while developing).

## Changes

- When an installed extension's manifest lists no `readOnlyTools`, once the session runs (`runQuery()` attaching it), the kit reads its servers' tools from `mcpServerStatus()` and adds those with `annotations.readOnly` to the plan gate's list; again when the extension is turned on in the session. A manifest with a list keeps it, whatever the server says.
- `extension info` says where the read-only tools come from (the manifest, or the server's hints).
- ADR-025: the trust decision (the manifest wins; a hint only fills its absence).
- Docs: `capabilities/extensions.md` (read-only tools; an extension with dependencies installs its package, not a development folder), `reference/sdk-behaviors.md` if `mcpServerStatus()`'s annotations hold surprises.

## Acceptance

- An installed server marking a tool `readOnlyHint: true`, with no `readOnlyTools` in its manifest, runs it in plan mode, and a tool it doesn't mark is denied.
- With `readOnlyTools` in the manifest, a tool the server marks but the manifest omits is denied.
- Checked with the real CLI (no model call), and live with moodle-mcp's tools if it's ready.
- `verify` passes.
