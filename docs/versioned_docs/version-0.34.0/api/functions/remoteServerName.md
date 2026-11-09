# Function: remoteServerName()

```ts
function remoteServerName(extension, server): string;
```

Defined in: [core/externalExtensions.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L75)

The name a session gives an extension's remote server: its own, prefixed with the extension's.
The SDK's CLI keeps OAuth tokens by server name (confirmed empirically, CLI 2.1.300): a server
named like one in the runner's own Claude Code would sign in with the runner's token.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `extension` | `string` |
| `server` | `string` |

## Returns

`string`
