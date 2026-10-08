# Function: setExtensionEnabled()

```ts
function setExtensionEnabled(
   scopeDir, 
   name, 
   enabled
): Promise<boolean>;
```

Defined in: [core/externalExtensions.ts:510](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L510)

Enables or disables an installed extension in a scope; false when it isn't there.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scopeDir` | `string` |
| `name` | `string` |
| `enabled` | `boolean` |

## Returns

`Promise`\<`boolean`\>
