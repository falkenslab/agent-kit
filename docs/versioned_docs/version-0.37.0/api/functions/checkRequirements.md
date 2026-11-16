# Function: checkRequirements()

```ts
function checkRequirements(requirements, options?): Promise<RequirementCheck[]>;
```

Defined in: [core/extensionRequirements.ts:153](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L153)

Checks an extension's requirements, all at once.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `requirements` | readonly [`ExtensionRequirement`](../interfaces/ExtensionRequirement.md)[] |
| `options` | [`RequirementCheckOptions`](../interfaces/RequirementCheckOptions.md) |

## Returns

`Promise`\<[`RequirementCheck`](../interfaces/RequirementCheck.md)[]\>
