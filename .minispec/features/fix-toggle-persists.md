# Turning an extension off in a session leaves it off in the person's Claude Code config

Issue: [#75](https://github.com/falkenslab/agent-kit/issues/75)

## Problem

- `/extensions disable X` in a chat, then `extension enable X` from a terminal: the next session starts with X's servers disabled, without saying why, though its lock says enabled and the kit passes them again.
- The person's `~/.claude.json` collects entries for the agent's folders (`projects[<folder>].disabledMcpServers`): `jokebook` for Captain Whiskers' home, `spawner` for every temporary folder the kit's tests used. Their own Claude Code in an agent's folder starts with those servers disabled too.

## Cause

The live switch (#49, `liveExtensions.ts`) turns an installed extension's servers off with the SDK's `toggleMcpServer(name, false)`, and the CLI saves that in the Claude Code config of the session's folder, not only in the session (confirmed empirically, CLI 2.1.300: a server switched off in one session is `disabled` in the next, though its options pass it again). The kit's tests run real sessions with the runner's own config folder.

## Solution

To decide when it's fixed; the options:

- Turn back on, when a session opens, every server the kit passes that the CLI reports `disabled` though the kit wants it on (the lock says enabled): `toggleMcpServer(name, true)` removes the saved entry, as the CLI does itself.
- Or keep an agent's sessions in a Claude Code config folder of its own (`CLAUDE_CONFIG_DIR`), where the model's login also lives: a larger change (see ADR-028's consequences).
- The tests that switch servers (`extensionProcesses.test.ts`, `liveExtensions.test.ts`) run with a temporary `CLAUDE_CONFIG_DIR`, so they never write to the runner's `~/.claude.json`.
- Say what was left behind, so the person can clean it (`disabledMcpServers` for the kit's temporary folders and the agent's own).

## Verification

- A session that switches an extension off, then a new session with the lock enabled: its servers are connected.
- Running the kit's tests leaves no new entry in the runner's `~/.claude.json`.
