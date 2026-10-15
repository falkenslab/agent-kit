# Type Alias: ExtensionRestart

```ts
type ExtensionRestart = (name) => Promise<boolean>;
```

Defined in: [core/liveExtensions.ts:130](https://github.com/falkenslab/agent-kit/blob/main/src/core/liveExtensions.ts#L130)

Restarts `name`'s MCP servers in the running session, so they take its options as they are now
(#55): the launcher reads them when it starts a server. `reconnectMcpServer()` ends a server's
process and starts a new one with the session's config (confirmed empirically; `setMcpServers()`
replaced every server of the session and left the old process running). False when it can't
be done here (not running in this session, or the session hasn't started): the next session
takes them.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

## Returns

`Promise`\<`boolean`\>
