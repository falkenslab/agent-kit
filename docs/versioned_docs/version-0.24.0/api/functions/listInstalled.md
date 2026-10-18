# Function: listInstalled()

```ts
function listInstalled(dirs): Promise<InstalledExtension[]>;
```

Defined in: [core/externalExtensions.ts:442](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L442)

Every extension installed in the scopes, the project's first.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |

## Returns

`Promise`\<[`InstalledExtension`](../interfaces/InstalledExtension.md)[]\>
