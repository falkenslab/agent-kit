# Interface: MemoryOptions\<TConfig\>

Defined in: [extensions/memory/index.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/memory/index.ts#L31)

The memory's options.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](BaseSessionConfig.md) | [`BaseSessionConfig`](BaseSessionConfig.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | [`FolderOption`](../type-aliases/FolderOption.md)\<`TConfig`\> | Its folder, the agent's own outside any project (e.g. `~/.miyagi/memory`), kept across all the person's projects and never shared with another agent. Without a folder the extension is off. | [extensions/memory/index.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/memory/index.ts#L36) |
