# Function: remoteHosts()

```ts
function remoteHosts(manifest): string[];
```

Defined in: [core/externalExtensions.ts:81](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L81)

The hosts an extension's remote servers talk to, for the person to read before installing it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `manifest` | `Pick`\<[`ExternalManifest`](../interfaces/ExternalManifest.md), `"servers"`\> |

## Returns

`string`[]
