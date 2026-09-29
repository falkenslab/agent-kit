---
sidebar_position: 2
title: Troubleshooting
description: Common problems when building or running an agent with the kit, and their fixes.
---

# Troubleshooting

## The agent doesn't start: no Claude authentication token

Set `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token` creates one with a Pro/Max subscription) or `ANTHROPIC_API_KEY`. Node doesn't read `.env` files by itself: load yours with `process.loadEnvFile()` (see [Authentication](../getting-started/authentication.md)).

## `ERR_REQUIRE_ESM` or "Cannot use import statement outside a module"

The kit is ESM only. Add `"type": "module"` to your `package.json`, or use `.mts` files.

## The agent answers in the wrong language

- Force it: `--language=en`, or `language: "en"` in the config.
- Write the prompts, skills and commands the model reads in English.
- The runner's Claude Code account name can still pull the replies; see [Languages](../sessions/languages.md#limits).

## "Unknown command: /something"

The command doesn't exist in this session. Plugin commands are namespaced: `/my-plugin:something`. Check the plugin's `name` in `.claude-plugin/plugin.json`, and that `pluginRoots()` returns its folder.

## A skill is never used

- Its `description` must say when to apply it.
- With a `skills` list in the spec, it must be listed (`plugin:skill` for a plugin's).
- The session needs the `Skill` tool: it's added with plugins or file tools.

## "… can't be written: writing is only allowed inside …"

The [file scope](../security/file-scope.md) denied it. Writing is allowed in `knowledgeDir` and `extraWritableDirs` only; `sourcesDir` is read-only by design. Add a folder to `extraWritableDirs` if the agent needs it.

## "Grep only searches inside …"

`Grep` needs a `path` inside `knowledgeDir`, `sourcesDir` or `extraWritableDirs`. Tell the agent where to search, or add the folder.

## A subagent never runs, or "Delegation is only available for …"

- Only the types in `allowedSubagentTypes` can be spawned; check the name the model uses matches a key of `agents`.
- Every tool a subagent declares must exist in the session. A built-in tool the session doesn't have (a file tool without a knowledge or sources folder) makes the SDK refuse to spawn it.
- Say in the system prompt when to use each subagent.

## An MCP server isn't there

The chat shows "Some MCP servers failed to connect: …". Run the server's command by hand to see its error. External servers' tools only exist if the server starts.

## The approval panel never shows up in guided mode

The model decides when to call the approval tool. Word `humanApprovalTexts.description` for your domain and reinforce it in the prompt; for something that must always ask, ask from your own tool with `askForDecision()` or use `interactive` mode.

## Checkpoints hang in a background job

Without a TTY, checkpoints wait for the [response file](../human-in-the-loop/response-file.md). Use `autonomous` mode for unattended runs, or answer through the file.

## Garbled or misaligned screen

- Use a terminal with Unicode and 24-bit color (Windows Terminal, iTerm2, most Linux terminals).
- Don't use emoji in header art or labels drawn in fixed places: use single-column characters.
- Try `fullscreen: false`, or `plain: true` for the readline chat.

## `/resume` doesn't list an old conversation

Only runs with a `session.json` (created with a runs folder and a session opener) are listed.

## Tokens per call are high

List your skills (`skills`), load no settings files (`settingSources: []`), grant only the tools you need. See [Context and cost](../sessions/context-and-cost.md).
