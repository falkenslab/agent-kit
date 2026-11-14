# Interface: HeaderInfo

Defined in: [tui/ink/header.ts:6](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/header.ts#L6)

The top of the Ink chat: a title, optional fields and an optional logo.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-art"></a> `art?` | `string`[] | A small logo drawn left of the title, one string per row, colored as the consumer likes. One-column characters only (ASCII, box and block characters such as ▄ ▀ █), never emoji: their width is measured differently by the kit and by the terminal, which would shift the title (see the feature `ink-claude-style`). | [tui/ink/header.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/header.ts#L16) |
| <a id="property-fields"></a> `fields?` | `Record`\<`string`, `string`\> | Shown under the title as "name value" pairs, e.g. the workspace or the model. | [tui/ink/header.ts:9](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/header.ts#L9) |
| <a id="property-title"></a> `title` | `string` | - | [tui/ink/header.ts:7](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/header.ts#L7) |
