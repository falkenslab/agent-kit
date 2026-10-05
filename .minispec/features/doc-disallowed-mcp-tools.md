# Document that disallowedTools doesn't remove MCP tools from the context

Issue: [#26](https://github.com/falkenslab/agent-kit/issues/26)

## Goal

The docs say that `disallowedTools` blocks an MCP tool but doesn't take its definition out of the request, so nobody uses it expecting to save context.

## Context

- Measured on Captain Whiskers with real calls (input tokens of the first call):
  - disallowing a built-in tool removes its definition: `TodoWrite` −3.4k, `Bash` −1.9k, `Read`/`Glob`/`Grep` −2.7k;
  - disallowing MCP tools changes nothing: all ten `knowledge_*` tools, the six sources tools, the approval tools or the time tools, ±3 tokens;
  - turning the features off does remove them: no `knowledgeDir` −3.4k, no `sourcesDir` −4.9k (with `Read`/`Glob`/`Grep`), autonomous mode −1.5k.
- `getContextUsage()` (the SDK's `/context`) reports 0 tokens for in-process MCP tools before the session's first turn, so it underestimates a session's fixed part (15.5k estimated vs 23.7k real).
- `docs/content/sessions/context-and-cost.md` suggests `disallowedTools` to remove a tool, without the distinction.

## Changes

- `reference/sdk-behaviors.md`: both behaviors, confirmed empirically.
- `sessions/context-and-cost.md`: what each part of the kit costs (the measured table), that MCP tools only go away by turning their feature off, and the `getContextUsage()` caveat.
- `core-concepts/agent-spec.md`: the `disallowedTools` row says it.

## Acceptance

- The three pages say it, with the measured figures; `npm run docs:build` passes.
