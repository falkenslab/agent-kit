# Interface: SourcesOptions\<TConfig\>

Defined in: [extensions/sources/index.ts:15](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/sources/index.ts#L15)

The sources extension's options.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](BaseSessionConfig.md) | [`BaseSessionConfig`](BaseSessionConfig.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | [`FolderOption`](../type-aliases/FolderOption.md)\<`TConfig`\> | The sources folder: original files kept as obtained, apart from any notes. Material the person drops in, plus whatever the agent saves with `save_to_sources` (downloaded documents, transcripts…). The agent reads and searches it, never edits it, and `save_to_sources` never overwrites. Without a folder the extension is off. | [extensions/sources/index.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/sources/index.ts#L22) |
| <a id="property-savedescription"></a> `saveDescription?` | `string` | The `save_to_sources` tool's description in the agent's own words, instead of the kit's generic one. | [extensions/sources/index.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/sources/index.ts#L24) |
