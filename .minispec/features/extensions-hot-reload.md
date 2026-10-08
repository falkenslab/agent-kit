# Extensions: hot reloading, and what's left after marketplaces

Issue: [#49](https://github.com/falkenslab/agent-kit/issues/49)

## Goal

Turning an extension on or off, or installing one, changes the running session without reopening it; and the rest of ADR-025 that #29 left is done or decided.

## Context

- Done (#29, #34, #37, #38): internal extensions, the two installed scopes with their locks, the launcher, plugins as extensions, marketplaces (folder, `github`, `url`, `git-subdir` sources; the official one and the others with a typed confirmation).
- Today `/extensions enable|disable` and the controller's `setExtension()` reopen the session to apply a change (it keeps the conversation, but restarts the CLI process and its MCP servers).
- ADR-025 also planned: the official repository's builder (bundling each server with esbuild, `claude plugin validate`, SHA-256, `claude plugin tag`), machine requirements, `npm` and `archive` sources, the SDK's `deny` rules as a second layer, manual intervention as an extension.

## Changes

- **Hot reloading.** `setMcpServers()` (naming every in-process server to keep: it replaces the dynamic set), `reloadPlugins()` on paths declared at start (one per installed extension, filled or emptied), `skills: "all"` with `disableBundledSkills` (a `skills` list is fixed at start), `skillOverrides` to hide one; the kit's rules in a registry the hooks read on every call; a note to the model on the next message (`takeNotice`). Confirm each SDK behavior empirically first.
- **The official repository's builder**: a script and workflow there (esbuild bundle, `claude plugin validate`, hash, `claude plugin tag`); into the kit when a second repository needs it.
- **Machine requirements** (`requires: docker`), checked when an extension loads, off with why.
- **`npm` and `archive` sources** for marketplaces: `npm pack` (never `npm install`), an archive with its `sha256`.
- **The SDK's `deny` rules** as a second layer for `deniedPaths` and the SDK's credentials.
- **Manual intervention** as an extension.

## Acceptance

- In Captain Whiskers' chat, `/extensions disable jokebook` takes its tool and skill away in the same session, without restarting the CLI, and `enable` brings them back; the model is told.
- Each other item is done, or recorded in ADR-025 as decided against, with why.
- `verify` passes; the extensions guide says what applies at once and what needs a new session.
