# Function: createSaveToSourcesServer()

```ts
function createSaveToSourcesServer(
   runDir, 
   sourcesDir, 
   description?
): McpSdkServerConfigWithInstance;
```

Defined in: [core/tools/saveToSources.ts:61](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L61)

`save_to_sources`: the only way the agent adds to `sourcesDir` (Write/Edit are scoped
to the notes folder, see hooks/fileScopeGate.ts), so the originals stay as obtained.
Deliberately just an fs.copyFile with COPYFILE_EXCL — no parsing, no format conversion,
no overwriting. A document downloaded via a browser-automation tool typically lands in
this run's own folder, which the file tools can't reach; this tool's only job is getting
it into `sourcesDir`, where the SDK's own Read tool already knows how to interpret it
(PDF/DOCX text extraction, multimodal images).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `runDir` | `string` | `undefined` |
| `sourcesDir` | `string` | `undefined` |
| `description` | `string` | `DEFAULT_DESCRIPTION` |

## Returns

`McpSdkServerConfigWithInstance`
