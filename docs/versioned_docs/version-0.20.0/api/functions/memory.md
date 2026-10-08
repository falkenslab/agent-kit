# Function: memory()

```ts
function memory<TConfig>(options): Extension;
```

Defined in: [extensions/memory/index.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/memory/index.ts#L45)

The memory of the person (#34): what the agent learns about the person it works for, kept
across all their projects in a folder of its own, reached only through its tools (`recall`,
`remember`, `forget`). What it remembers must quote the person's own messages, which it hears
through a `UserPromptSubmit` hook (and, for a resumed run, from the run's conversation).

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) | [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`MemoryOptions`](../interfaces/MemoryOptions.md)\<`TConfig`\> |

## Returns

[`Extension`](../interfaces/Extension.md)
