# Function: setExtensionOptions()

```ts
function setExtensionOptions(
   where, 
   name, 
   typed
): Promise<void>;
```

Defined in: [core/externalExtensions.ts:884](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L884)

Sets an installed extension's options (#55), each from what the person typed (`undefined`
clears it), checked against its `userConfig`: sensitive ones into the scope's secrets, the rest
into its lock. A running session's servers take them when they start again.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `where` | `string` \| [`InstalledExtension`](../interfaces/InstalledExtension.md) |
| `name` | `string` |
| `typed` | `Record`\<`string`, `string` \| `undefined`\> |

## Returns

`Promise`\<`void`\>
