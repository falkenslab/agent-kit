# Function: createSaveToSourcesServer()

```ts
function createSaveToSourcesServer(
   runDir, 
   sourcesDir, 
   description?, 
   options?
): McpSdkServerConfigWithInstance;
```

Defined in: [core/tools/saveToSources.ts:136](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L136)

The tools that keep `sourcesDir`, the originals the agent reads but never edits (Write/Edit
are scoped to the notes folder, see hooks/fileScopeGate.ts): `save_to_sources`,
`list_sources` and `download_to_sources`, plus `request_file` and `retire_source` when a
person can be asked. Nothing is ever overwritten or deleted; the bookkeeping is in
sources.ts.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `runDir` | `string` | `undefined` |
| `sourcesDir` | `string` | `undefined` |
| `description` | `string` | `DEFAULT_DESCRIPTION` |
| `options` | [`SourceToolsOptions`](../interfaces/SourceToolsOptions.md) | `{}` |

## Returns

`McpSdkServerConfigWithInstance`
