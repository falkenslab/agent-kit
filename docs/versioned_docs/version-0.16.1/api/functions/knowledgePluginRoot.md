# Function: knowledgePluginRoot()

```ts
function knowledgePluginRoot(variant?): string;
```

Defined in: [core/knowledge.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/knowledge.ts#L19)

Absolute path of the plugin shipped with the kit, next to `dist/` (or `src/` under tsx):
`assets/knowledge-plugin`, whose skills work through the `knowledge_*` tools, or with
`"files"` `assets/knowledge-plugin-files`, whose skills work on the files (ADR-024).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `variant` | `"files"` \| `"tools"` | `"tools"` |

## Returns

`string`
