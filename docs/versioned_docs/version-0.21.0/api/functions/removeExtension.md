# Function: removeExtension()

```ts
function removeExtension(
   scopeDir, 
   name, 
   options?
): Promise<boolean>;
```

Defined in: [core/externalExtensions.ts:488](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L488)

Removes an extension from a scope (its files and its lock entry; a linked one's folder is left
where it is), and its data folder with `deleteData`; false when it wasn't there.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scopeDir` | `string` |
| `name` | `string` |
| `options` | \{ `deleteData?`: `boolean`; \} |
| `options.deleteData?` | `boolean` |

## Returns

`Promise`\<`boolean`\>
