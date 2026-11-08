# Interface: AgentRun

Defined in: [core/runner.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L104)

A running session, as `runQuery()` returns it: its events and the controls of the SDK's `Query`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-close"></a> `close` | () => `void` | Ends the session. No further events arrive after this; safe to call even if `events` is still being iterated elsewhere (e.g. from a SIGINT handler racing the main loop). | [core/runner.ts:110](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L110) |
| <a id="property-contextusage"></a> `contextUsage` | () => `Promise`\<[`ContextUsage`](ContextUsage.md) \| `null`\> | How full the context window is now, or null if the session can't tell (see the SDK's `Query.getContextUsage()`). | [core/runner.ts:114](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L114) |
| <a id="property-events"></a> `events` | `AsyncIterable`\<[`AgentEvent`](../type-aliases/AgentEvent.md)\> | Normalized events for this run — iterate with `for await`. | [core/runner.ts:106](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L106) |
| <a id="property-interrupt"></a> `interrupt` | () => `Promise`\<`unknown`\> | Interrupts the current turn (doesn't end the session — a caller wanting a full stop should also call `close()`). | [core/runner.ts:108](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L108) |
| <a id="property-supportedcommands"></a> `supportedCommands` | () => `Promise`\<`SlashCommand`[]\> | This session's own slash commands (skills doubling as typable commands, etc.) — only meaningful once the session has actually started (see the SDK's own `Query.supportedCommands()`). | [core/runner.ts:112](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L112) |
