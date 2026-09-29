# ADR-020: Conversations are kept in their run folder

## Decision

With a runs folder (`runsDir`) and a session opener instead of fixed options, the chats (`runChatInk()`, `runChatTui()`) give each run its own folder (`<runsDir>/<timestamp>/`) and keep the SDK's transcript of the conversation there through a `SessionStore` (`createRunStore()`): `conversation.jsonl`, `subagents/*.jsonl` and `session.json` (the session's id, and which file is which subagent's). The run folder is what a person resumes: `--continue` starts with the latest one, `/resume` lists them by date and last message; resuming reopens the session in that same folder, so its session log and transcript keep growing in one place.

## Motivation

- The SDK wrote the conversation to `~/.claude/projects/<encoded cwd>/<sessionId>.jsonl`, out of the workspace, and nothing linked it to the run folder holding the session log and transcript.
- `CLAUDE_CONFIG_DIR` can't do it: only the root moves (`<dir>/projects/<encoded cwd>/` is fixed), and it takes the runner's Claude Code configuration and login with it.
- A store receives every transcript entry and is asked for them before resuming (confirmed empirically: a resumed session remembers the conversation, subagents included, with the CLI's own copy deleted, and keeps its session id).
- MCP servers, the step gate and the transcript logger are bound to the run folder, so `/resume` builds the session anew through the opener rather than editing the options.

## Consequences

- `SessionStore` is `@alpha`: its shape is checked on every SDK upgrade (`upgrade-sdk`).
- The CLI still writes its copy under `~/.claude/projects/`: it can't be turned off while a store is in use.
- The SDK transcript isn't redacted, unlike `transcript.jsonl`: the runs folder must stay out of version control.
- Runs from before this change (no `session.json`) aren't listed. A run folder is created on start even if the person resumes another right away.
- Inline (not full screen), a resumed conversation is drawn after what's already on screen: the terminal's scrollback can't be taken back. In full screen the history is redrawn from the start.
- Without `runsDir` everything works as before: fixed options, the agent's own run folder and `sessionLogPath`.
