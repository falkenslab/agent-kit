# Interface: ExtensionOption

Defined in: [core/extensionOptions.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L18)

One of an extension's options, as Claude Code's `userConfig` declares it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-default"></a> `default?` | [`OptionValue`](../type-aliases/OptionValue.md) | - | [core/extensionOptions.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L25) |
| <a id="property-description"></a> `description` | `string` | - | [core/extensionOptions.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L22) |
| <a id="property-max"></a> `max?` | `number` | - | [core/extensionOptions.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L34) |
| <a id="property-min"></a> `min?` | `number` | A number's bounds. | [core/extensionOptions.ts:33](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L33) |
| <a id="property-multiple"></a> `multiple?` | `boolean` | Several values (comma-separated where they're typed). | [core/extensionOptions.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L31) |
| <a id="property-options"></a> `options?` | (`string` \| `number`)[] | The values it may take, when it's a choice. | [core/extensionOptions.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L29) |
| <a id="property-required"></a> `required?` | `boolean` | Without a value (its own or a default), the extension doesn't run. | [core/extensionOptions.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L24) |
| <a id="property-sensitive"></a> `sensitive?` | `boolean` | A secret (a token, a password): asked without echo, kept apart, never shown back. | [core/extensionOptions.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L27) |
| <a id="property-title"></a> `title` | `string` | What it's called where the person is asked. | [core/extensionOptions.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L21) |
| <a id="property-type"></a> `type` | `"string"` \| `"number"` \| `"boolean"` \| `"directory"` \| `"file"` | - | [core/extensionOptions.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionOptions.ts#L19) |
