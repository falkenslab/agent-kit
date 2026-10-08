# Interface: PlanModeSpec\<TConfig\>

Defined in: [core/agentSpec.ts:205](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L205)

The domain's part of "plan" mode: which files hold the plan and which of its own tools only read.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](BaseSessionConfig.md) | [`BaseSessionConfig`](BaseSessionConfig.md) |

## Methods

### isPlanFile()?

```ts
optional isPlanFile(filePath, config): boolean;
```

Defined in: [core/agentSpec.ts:211](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L211)

Whether `filePath` (absolute) is a plan file Write/Edit may touch in plan mode, e.g.
`drafts/<slug>/plan.md`. It must also be writable under the file scope (`extraWritableDirs`),
which still applies.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `filePath` | `string` |
| `config` | `TConfig` |

#### Returns

`boolean`

***

### isReadOnlyTool()?

```ts
optional isReadOnlyTool(toolName, input): boolean;
```

Defined in: [core/agentSpec.ts:217](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L217)

Whether one of the agent's own MCP tools (`mcp__<server>__<tool>`) only reads, so plan
mode lets it run. Every MCP tool it doesn't vouch for is denied there: a forgotten tool
can't change anything.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `toolName` | `string` |
| `input` | `Record`\<`string`, `unknown`\> |

#### Returns

`boolean`
