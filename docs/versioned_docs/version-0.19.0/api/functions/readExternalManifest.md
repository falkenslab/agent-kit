# Function: readExternalManifest()

```ts
function readExternalManifest(dir): Promise<ExternalManifest>;
```

Defined in: [core/externalExtensions.ts:118](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L118)

Reads an extension's manifest, checking what the kit needs from it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |

## Returns

`Promise`\<[`ExternalManifest`](../interfaces/ExternalManifest.md)\>
