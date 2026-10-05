# Interface: PlanModeSpec\<TConfig\>

Defined in: [core/agentSpec.ts:228](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L228)

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

Defined in: [core/agentSpec.ts:234](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L234)

Whether `filePath` (absolute) is a plan file Write/Edit may touch in plan mode, e.g.
`drafts/<slug>/plan.md`. It must also be writable under the file scope (`knowledgeDir`
or `extraWritableDirs`), which still applies.

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

Defined in: [core/agentSpec.ts:240](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L240)

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
