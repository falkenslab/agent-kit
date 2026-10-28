# Interface: ResolvedLanguage

Defined in: [core/language.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L23)

The result of `resolveLanguage()`: the language to use and why any asked-for code was skipped.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-language"></a> `language` | [`Language`](../type-aliases/Language.md) | - | [core/language.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L24) |
| <a id="property-warnings"></a> `warnings` | `string`[] | One line per code that was asked for and isn't supported (English text, for the caller to show). | [core/language.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L26) |
