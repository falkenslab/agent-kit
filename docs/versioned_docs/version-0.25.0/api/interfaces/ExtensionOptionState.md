# Interface: ExtensionOptionState

Defined in: [core/externalExtensions.ts:841](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L841)

One of an installed extension's options and its value now (a sensitive one's value is never given: only whether it's set).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-isdefault"></a> `isDefault` | `boolean` | Its value is its default, not one the person gave. | [core/externalExtensions.ts:849](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L849) |
| <a id="property-key"></a> `key` | `string` | - | [core/externalExtensions.ts:842](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L842) |
| <a id="property-option"></a> `option` | [`ExtensionOption`](ExtensionOption.md) | - | [core/externalExtensions.ts:843](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L843) |
| <a id="property-set"></a> `set` | `boolean` | Whether it has a value (its own or its default). | [core/externalExtensions.ts:847](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L847) |
| <a id="property-value"></a> `value?` | [`OptionValue`](../type-aliases/OptionValue.md) | Its value, when it has one and isn't sensitive. | [core/externalExtensions.ts:845](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L845) |
