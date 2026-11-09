# Function: checkRequirements()

```ts
function checkRequirements(requirements, options?): Promise<RequirementCheck[]>;
```

Defined in: [core/extensionRequirements.ts:122](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L122)

Checks an extension's requirements, all at once.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `requirements` | readonly [`ExtensionRequirement`](../interfaces/ExtensionRequirement.md)[] |
| `options` | \{ `env?`: `ProcessEnv`; `timeoutMs?`: `number`; \} |
| `options.env?` | `ProcessEnv` |
| `options.timeoutMs?` | `number` |

## Returns

`Promise`\<[`RequirementCheck`](../interfaces/RequirementCheck.md)[]\>
