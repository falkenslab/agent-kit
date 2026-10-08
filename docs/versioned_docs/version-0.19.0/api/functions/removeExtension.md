# Function: removeExtension()

```ts
function removeExtension(scopeDir, name): Promise<boolean>;
```

Defined in: [core/externalExtensions.ts:408](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L408)

Removes an extension from a scope (its files and its lock entry); false when it wasn't there.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scopeDir` | `string` |
| `name` | `string` |

## Returns

`Promise`\<`boolean`\>
