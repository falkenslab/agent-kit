# Extensions' servers know the person's language

Issue: [#86](https://github.com/falkenslab/agent-kit/issues/86)

## Goal

An installed extension's local MCP servers learn the session's language, so their own questions (MCP elicitation) and messages can be in it.

## Context

- Since #77 a tool whose server confirms it itself asks with the server's own question, but the servers don't know the person's language: in a Spanish chat, docker-mcp asks "Stop the lab …? Yes, go ahead", and moodle-mcp "Yes, do it".
- The kit already translates the panel's title and the tools' labels (#79); what the server writes is the server's.
- The kit starts an extension's local servers through its launcher with a clean environment (`serverLaunch()`, the launcher's `keep` list, `src/core/externalExtensions.ts`), and fills `${user_config.*}` in their `args` and `env` (#55).
- Remote servers can't be told this way; they're out of scope.

## Changes

- The launcher passes `AGENT_KIT_LANGUAGE=<language>` (the language the kit resolved for the session: `en`, `es`, `fr`, `de`) to every installed extension's local server.
- `.mcp.json` may name it in `args` or `env` as `${agent_kit.language}`, as it names `${user_config.*}`.
- A server that doesn't read it keeps working as before.
- A server started before the language is switched in the chat keeps the old one until it starts again; switching the language restarts the extensions' local servers when the session is reopened anyway (to check).
- Docs (English and Spanish): Writing an extension (the server's environment), the manifest reference.
- Then: issues in falkenslab/moodle-mcp and falkenslab/docker-mcp to translate their confirmations.

## Acceptance

- A test server sees `AGENT_KIT_LANGUAGE=es` in a Spanish session, and `${agent_kit.language}` filled in its arguments.
- `verify` passes.
