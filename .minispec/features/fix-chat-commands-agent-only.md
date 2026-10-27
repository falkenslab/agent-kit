# The chat's / menu offers Claude Code's own commands to the agent's user

Issue: [#87](https://github.com/falkenslab/agent-kit/issues/87)

## Problem

- The chat's `/` completion offers every command the SDK reports, so a teacher using miyagi sees Claude Code's own commands and the CLI's bundled skills next to the agent's: `/__remote-workflow`, `/advisor`, `/agents`, `/artifact-capabilities`, `/autocompact`, `/batch`…
- They're for whoever develops with Claude Code, not for the agent's user, and some make no sense in an agent.

## Cause

`src/chat/chatController.ts` builds `commands` and `commandDetails` from `run.supportedCommands()` plus its own (`resume`, `plan`, `extensions`, the view's). `supportedCommands()` lists everything the CLI knows, whatever `settingSources` says. The model's skills are narrowed (`AgentSpec.skills`); the list a person picks from isn't.

## Solution

- By default the chat offers only the agent's commands: its plugins' (`<plugin>:<command>`), the enabled extensions', the project's own when `settingSources` includes `project`, plus the kit's and the view's. How to tell them apart from the CLI's is found first (the command's source in `supportedCommands()`, else the plugins' and the project's command folders).
- `ChatSettings.commands: "agent" | "all"` (or a filter function) for an agent that wants the CLI's too.
- A typed command that isn't offered still goes to the SDK, as today: only the menu changes.
- Docs (English and Spanish): the Ink and plain chats, Custom hosts (`commandDetails`).

## Verification

- A test: with a fake run listing the CLI's commands and a plugin's, the state's `commands` keeps the plugin's and the kit's only; `"all"` keeps every one.
- Checked in the captain: `/` shows his commands, his extensions' and the kit's.
- `verify` passes.
