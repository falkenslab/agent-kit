# Coverage of every option, and an end-to-end bench

Issue: [#35](https://github.com/falkenslab/agent-kit/issues/35)

## Goal

Every option and feature of the kit is exercised somewhere known (unit tests, Captain Whiskers, or an end-to-end run), and "does everything still work?" is one command away instead of a hand-made walk through the captain.

## Context

- Unit tests cover the mechanics (257 today), but what the model does with them (does it save a preference, ask once before retiring, compare dates, keep a task list) only shows in real sessions. Those were checked by hand: scripted chats driven through a pseudo-terminal and a summary of each run's tool calls, kept in a scratch folder, not in the repo.
- Captain Whiskers is the template and the end-to-end check, but he can't hold every option: some exclude each other (autonomous vs guided, the knowledge base vs `knowledgeBase: false`, the kit's store vs a custom one, the Ink chat vs readline, a one-shot `runQuery` vs a chat, a terminal vs a host's own `InteractionPort`), and loading everything would make him costly and a confusing example. Some he alternates through environment variables (`CAPTAIN_MODE`, `CAPTAIN_PLAIN`, `CAPTAIN_INLINE`, `CAPTAIN_TOOL_DETAIL`).
- The walk-throughs found real bugs every time (pages in the wrong language, the index by file path, asking twice before retiring), which unit tests couldn't.

## Changes

- **A coverage matrix** (in the docs' reference or `.minispec/`): every `AgentSpec` and `BaseSessionConfig` option, every built-in tool, extension and chat feature, and where each is exercised: unit tests, Captain Whiskers (which feature, which step of his test script), the end-to-end bench. Gaps listed.
- **An end-to-end bench** in the repo, `npm run e2e`, apart from `npm test` (it calls the model, costs money and needs Claude authentication; never in CI by default):
  - scripted sessions: the messages to send, the panels to answer, waiting for the agent's prompt rather than fixed times;
  - assertions on what happened: the tools called (from the run's `conversation.jsonl`), the files and pages written, the denials;
  - a short report per scenario; repeatable runs for behaviour that varies (e.g. 3 runs, all must pass).
- **Small agents for what excludes each other**, inside the bench (not public examples): a notes agent (`knowledgeBase: false`), one with an in-memory `KnowledgeStore`, an autonomous one-shot `runQuery`, a plugin-only agent with no folders, a "desktop host" with its own `InteractionPort` and no terminal.
- Captain Whiskers' README test script becomes scenarios of the bench.

## Acceptance

- The matrix lists every option with where it's exercised, and no option is left without a place.
- `npm run e2e` runs the captain's scenarios and the small agents', and reports pass or fail per scenario; a deliberately broken behaviour (e.g. the index back to file paths) makes a scenario fail.
- The docs say how to run it and what it costs.
