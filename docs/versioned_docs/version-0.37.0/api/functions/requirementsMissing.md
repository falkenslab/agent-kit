# Function: requirementsMissing()

```ts
function requirementsMissing(installed): Promise<string[]>;
```

Defined in: [core/externalExtensions.ts:698](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L698)

What an installed extension needs and this computer lacks, as `missingRequirement()` says it,
checked with its options as they are now: after `extension add --set`, a program the options
name (a virtual environment's python) is checked there, not on the `PATH`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `installed` | [`InstalledExtension`](../interfaces/InstalledExtension.md) |

## Returns

`Promise`\<`string`[]\>
