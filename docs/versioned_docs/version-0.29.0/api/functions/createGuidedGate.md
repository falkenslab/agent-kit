# Function: createGuidedGate()

```ts
function createGuidedGate(options): GuidedGate;
```

Defined in: [core/hooks/guidedGate.ts:57](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L57)

Guided mode's gate for installed extensions' tools that change things (#74, #76): ADR-025 treats
every extension tool as publishing unless it's known to only read, and in guided mode the person
says yes before one runs, whatever the model did first. The step gate covers interactive mode
(it asks before everything) and the plan gate plan mode (it denies), so this one decides only in
guided and autonomous mode, where no one can be asked and `autonomous` says what happens.

Read-only tools (the manifest's `readOnlyTools`, else the server's `readOnlyHint`) never ask.
The rest ask through the interaction port, with answers the person can make last: this call,
this session, always (kept in the extension's lock), no, never (kept too). Right after
`request_human_approval` is approved, calls go on until the person's next message (a batch),
except those that always ask: the agent's or the manifest's `confirmTools`, else the server's
`destructiveHint`, asked on every call, so they're offered only yes, no and never (#78). An extension whose lock says `off`
runs without asking. A tool whose server asks the person itself (`serverConfirmTools`, #77)
isn't asked about too in guided mode, where that question reaches the person: one question,
the server's. Approving gives no decision of its own, so the other gates still judge.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `autonomous?`: `"allow"` \| `"deny"`; `extensions`: readonly [`GuardedExtension`](../interfaces/GuardedExtension.md)[]; `labels?`: () => [`ToolLabels`](../type-aliases/ToolLabels.md); `mode`: () => [`Mode`](../type-aliases/Mode.md); `runDir`: `string`; `isDestructive`: `Promise`\<`boolean`\>; `isReadOnly`: `Promise`\<`boolean`\>; `record?`: `Promise`\<`void`\>; \} | - |
| `options.autonomous?` | `"allow"` \| `"deny"` | In autonomous mode, where no one can be asked: denied (the default) or run. |
| `options.extensions` | readonly [`GuardedExtension`](../interfaces/GuardedExtension.md)[] | - |
| `options.labels?` | () => [`ToolLabels`](../type-aliases/ToolLabels.md) | The tools' labels in the session's language, to say what's about to happen. |
| `options.mode` | () => [`Mode`](../type-aliases/Mode.md) | - |
| `options.runDir` | `string` | - |
| `options.isDestructive` | - |
| `options.isReadOnly` | - |
| `options.record?` | - |

## Returns

[`GuidedGate`](../interfaces/GuidedGate.md)
