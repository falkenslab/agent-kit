# Interface: ExtensionOptionState

Defined in: [core/externalExtensions.ts:731](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L731)

One of an installed extension's options and its value now (a sensitive one's value is never given: only whether it's set).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-isdefault"></a> `isDefault` | `boolean` | Its value is its default, not one the person gave. | [core/externalExtensions.ts:739](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L739) |
| <a id="property-key"></a> `key` | `string` | - | [core/externalExtensions.ts:732](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L732) |
| <a id="property-option"></a> `option` | [`ExtensionOption`](ExtensionOption.md) | - | [core/externalExtensions.ts:733](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L733) |
| <a id="property-set"></a> `set` | `boolean` | Whether it has a value (its own or its default). | [core/externalExtensions.ts:737](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L737) |
| <a id="property-value"></a> `value?` | [`OptionValue`](../type-aliases/OptionValue.md) | Its value, when it has one and isn't sensitive. | [core/externalExtensions.ts:735](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L735) |
