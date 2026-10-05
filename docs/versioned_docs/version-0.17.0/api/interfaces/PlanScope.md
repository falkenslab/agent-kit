# Interface: PlanScope

Defined in: [core/hooks/planGate.ts:5](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/planGate.ts#L5)

What plan mode lets through besides reading: see createPlanGate().

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-projectdir"></a> `projectDir` | `string` | Base for relative paths: the session's cwd. | [core/hooks/planGate.ts:7](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/planGate.ts#L7) |

## Methods

### isPlanFile()?

```ts
optional isPlanFile(filePath): boolean;
```

Defined in: [core/hooks/planGate.ts:9](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/planGate.ts#L9)

Whether Write/Edit may touch this file (absolute) in plan mode.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `filePath` | `string` |

#### Returns

`boolean`

***

### isReadOnlyTool()?

```ts
optional isReadOnlyTool(toolName, input): boolean;
```

Defined in: [core/hooks/planGate.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/planGate.ts#L11)

Whether one of the agent's own MCP tools only reads.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |
| `input` | `Record`\<`string`, `unknown`\> |

#### Returns

`boolean`
