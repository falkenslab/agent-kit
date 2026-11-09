# Keep an MCP tool result's _meta

Issue: [#91](https://github.com/falkenslab/agent-kit/issues/91)

## Goal

A client built on the kit can use what an MCP tool returns for the client in its result's `_meta`, live and in a resumed conversation.

## Context

The model never sees `_meta`, and a `PostToolUse` hook gets only the content. It does reach the kit: in the stream, on the `user` message's `tool_use_result`, and in the stored session, on the entry's `mcpMeta` (confirmed with SDK 0.3.300). The runner builds `tool-result` from the `tool_result` block only, so it's lost. A resumed conversation replays text alone: it has no tool calls to carry it. miyagi needs it for its "View in the classroom" link (falkenslab/miyagi#77), from moodle-mcp's `_meta.page` (falkenslab/moodle-mcp#56).

## Changes

- `tool-result` gets an optional `meta`: the result's `_meta`, untouched.
- `TranscriptCall` gets it too.
- A resumed conversation's transcript gets its tool calls back, with their results and `meta` from `mcpMeta`.
- The kit doesn't interpret it, and nothing about it goes to the model.

## Acceptance

- A tool returning `_meta` shows it on its `TranscriptCall`, live and after resuming.
- A tool without `_meta` has no `meta`.
- What the model receives doesn't change.
