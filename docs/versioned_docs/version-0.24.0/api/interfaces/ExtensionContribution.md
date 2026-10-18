# Interface: ExtensionContribution

Defined in: [core/extensions.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L56)

What an extension brings to a session. Every part is optional.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-api"></a> `api?` | `Record`\<`string`, `unknown`\> | What the session hands back to the host (e.g. the knowledge base's store), by name. | [core/extensions.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L87) |
| <a id="property-filetools"></a> `fileTools?` | `string`[] | Built-in file tools it needs the session to have (`Read`, `Glob`, `Grep`…). | [core/extensions.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L62) |
| <a id="property-helplines"></a> `helpLines?` | `string`[] | What it says about itself in this session (its commands, its folder), for the agent to tell the person (`SessionFacts`). | [core/extensions.ts:85](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L85) |
| <a id="property-hooks"></a> `hooks?` | `Partial`\<`Record`\<`HookEvent`, `HookCallbackMatcher`[]\>\> | Its hooks, by event, run after the kit's own: an internal extension's only (the memory hears the person's messages with `UserPromptSubmit`). | [core/extensions.ts:83](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L83) |
| <a id="property-mcpservers"></a> `mcpServers?` | `Record`\<`string`, `McpServerConfig`\> | MCP servers, by name (`mcp__<name>__<tool>`). | [core/extensions.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L58) |
| <a id="property-promptsection"></a> `promptSection?` | `string` | A section of the system prompt, after the agent's own and the list of extensions. | [core/extensions.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L60) |
| <a id="property-readonlydirs"></a> `readOnlyDirs?` | `string`[] | Folders the file tools may read and search, never write (a sources folder). | [core/extensions.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L64) |
| <a id="property-readonlyhintservers"></a> `readOnlyHintServers?` | `string`[] | Its MCP servers whose tools that only read plan mode learns from the servers themselves (`readOnlyHint`), asked while the session runs: an installed extension whose manifest lists no `readOnlyTools`. A list in the manifest wins: its servers aren't here. | [core/extensions.ts:74](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L74) |
| <a id="property-readonlytools"></a> `readOnlyTools?` | `string`[] | Its MCP tools that only read: plan mode lets them through. | [core/extensions.ts:68](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L68) |
| <a id="property-selfaskingtools"></a> `selfAskingTools?` | `string`[] | Its MCP tools that ask the person themselves: interactive mode's step gate doesn't ask first. | [core/extensions.ts:76](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L76) |
| <a id="property-toollabels"></a> `toolLabels?` | `Readonly`\<`Record`\<`string`, [`ToolLabel`](ToolLabel.md)\>\> | How the chat shows its tools, by full name, in the kit's language: its line and how it counts in a folded group. | [core/extensions.ts:78](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L78) |
| <a id="property-toolonlydirs"></a> `toolOnlyDirs?` | `object`[] | Folders reached only through its own tools, never the file tools, and what to use instead. | [core/extensions.ts:66](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L66) |
