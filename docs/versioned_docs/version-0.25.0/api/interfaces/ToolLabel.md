# Interface: ToolLabel

Defined in: [core/toolLabels.ts:80](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L80)

How the chat shows one tool: an extension's, by its full name (`ExtensionContribution.toolLabels`).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-phrase"></a> `phrase?` | [`ToolPhrase`](../type-aliases/ToolPhrase.md) | How it counts in a folded group's summary, `[one, many]` with `{n}`: `["read {n} page", "read {n} pages"]`. | [core/toolLabels.ts:84](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L84) |

## Methods

### label()

```ts
label(input): string;
```

Defined in: [core/toolLabels.ts:82](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L82)

Its line in the chat, from its input, in the kit's language: "Reading concept/llm-wiki".

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `Record`\<`string`, `unknown`\> |

#### Returns

`string`
