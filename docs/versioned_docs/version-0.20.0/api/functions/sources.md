# Function: sources()

```ts
function sources<TConfig>(options): Extension;
```

Defined in: [extensions/sources/index.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/sources/index.ts#L31)

The sources folder: originals kept as obtained, read with `Read` and `extract_text`, added and
retired only through its tools (`sourceFiles`). It knows nothing of a knowledge base (#30).

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) | [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`SourcesOptions`](../interfaces/SourcesOptions.md)\<`TConfig`\> |

## Returns

[`Extension`](../interfaces/Extension.md)
