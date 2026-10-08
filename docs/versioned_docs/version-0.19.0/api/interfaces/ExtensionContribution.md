# Interface: ExtensionContribution

Defined in: [core/extensions.ts:44](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L44)

What an extension brings to a session. Every part is optional.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-api"></a> `api?` | `Record`\<`string`, `unknown`\> | What the session hands back to the host (e.g. the knowledge base's store), by name. | [core/extensions.ts:69](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L69) |
| <a id="property-filetools"></a> `fileTools?` | `string`[] | Built-in file tools it needs the session to have (`Read`, `Glob`, `Grep`…). | [core/extensions.ts:50](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L50) |
| <a id="property-helplines"></a> `helpLines?` | `string`[] | What it says about itself in this session (its commands, its folder), for the agent to tell the person (`SessionFacts`). | [core/extensions.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L67) |
| <a id="property-hooks"></a> `hooks?` | `Partial`\<`Record`\<`HookEvent`, `HookCallbackMatcher`[]\>\> | Its hooks, by event, run after the kit's own: an internal extension's only (the memory hears the person's messages with `UserPromptSubmit`). | [core/extensions.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L65) |
| <a id="property-mcpservers"></a> `mcpServers?` | `Record`\<`string`, `McpServerConfig`\> | MCP servers, by name (`mcp__<name>__<tool>`). | [core/extensions.ts:46](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L46) |
| <a id="property-promptsection"></a> `promptSection?` | `string` | A section of the system prompt, after the agent's own and the list of extensions. | [core/extensions.ts:48](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L48) |
| <a id="property-readonlydirs"></a> `readOnlyDirs?` | `string`[] | Folders the file tools may read and search, never write (a sources folder). | [core/extensions.ts:52](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L52) |
| <a id="property-readonlytools"></a> `readOnlyTools?` | `string`[] | Its MCP tools that only read: plan mode lets them through. | [core/extensions.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L56) |
| <a id="property-selfaskingtools"></a> `selfAskingTools?` | `string`[] | Its MCP tools that ask the person themselves: interactive mode's step gate doesn't ask first. | [core/extensions.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L58) |
| <a id="property-toollabels"></a> `toolLabels?` | `Readonly`\<`Record`\<`string`, [`ToolLabel`](ToolLabel.md)\>\> | How the chat shows its tools, by full name, in the kit's language: its line and how it counts in a folded group. | [core/extensions.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L60) |
| <a id="property-toolonlydirs"></a> `toolOnlyDirs?` | `object`[] | Folders reached only through its own tools, never the file tools, and what to use instead. | [core/extensions.ts:54](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L54) |
