# Installed extensions with state: their data folder, linking, clean shutdown

Issue: [#52](https://github.com/falkenslab/agent-kit/issues/52)

## Goal

An installed extension can keep data across sessions and updates (a browser profile), be developed from its own folder without reinstalling, and leave no process behind when it's turned off: what the Moodle extension needs.

## Context

- An installed extension runs from a copy of its plugin in the run folder (`<runDir>/extensions/<name>`), and the installed folder is checked against its SHA-256 on every session: it has nowhere to write that lasts.
- Claude Code gives each plugin `${CLAUDE_PLUGIN_DATA}`, a persistent folder of its own. The kit only replaces `${CLAUDE_PLUGIN_ROOT}`; any other `${VAR}` comes from the agent's environment (`externalExtensions.ts`), so `${CLAUDE_PLUGIN_DATA}/profile` becomes `/profile`.
- Developing one means rebuilding, `extension add` again (a copy and a new hash) and reopening; skipping the `add` leaves it off because its files changed.
- `/extensions disable` removes its MCP server and the server's process ends; a browser it launched (Playwright) is a child with its own tree, and nobody checked it ends too. Left running, it keeps the profile locked and the next `enable` fails.

## Changes

- `${CLAUDE_PLUGIN_DATA}` in an installed extension's `.mcp.json` (args, env): `<scopeDir>/.data/<name>/`, created on first use, outside the plugin and its hash, kept on update. `extension remove` asks before deleting it (`--yes` deletes it too, `--keep-data` keeps it).
- `extension add --link <folder>`: registered where it is, no copy, no hash check (the lock says `linked`); `/extensions` and `extension list` show it as linked; `extension remove` only unregisters it. The session still runs it from a copy in the run folder, so a rebuild takes effect on the next session or `/extensions disable` + `enable`.
- Turning an extension off, closing a session or the launcher dying ends its server's whole process tree (Windows and POSIX), checked with a server that launches a child process.
- `extension info` shows the data folder and its size.
- Docs: `capabilities/extensions.md` (writing an installed extension: its data, developing it linked), `reference/sdk-behaviors.md` if the shutdown reveals SDK behaviour; ADR-025.

## Acceptance

- A server writing to `${CLAUDE_PLUGIN_DATA}` finds what it wrote in the next session and after `extension update`.
- A linked extension picks up a rebuilt server after `/extensions disable` + `enable`, with no reinstall.
- After `/extensions disable`, no child process of its server is left (test, plus a live check with Playwright and Edge).
- `verify` passes.
