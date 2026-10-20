# Interface: ExtensionOptionState

Defined in: [core/externalExtensions.ts:894](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L894)

One of an installed extension's options and its value now (a sensitive one's value is never given: only whether it's set).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-isdefault"></a> `isDefault` | `boolean` | Its value is its default, not one the person gave. | [core/externalExtensions.ts:902](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L902) |
| <a id="property-key"></a> `key` | `string` | - | [core/externalExtensions.ts:895](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L895) |
| <a id="property-option"></a> `option` | [`ExtensionOption`](ExtensionOption.md) | - | [core/externalExtensions.ts:896](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L896) |
| <a id="property-set"></a> `set` | `boolean` | Whether it has a value (its own or its default). | [core/externalExtensions.ts:900](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L900) |
| <a id="property-value"></a> `value?` | [`OptionValue`](../type-aliases/OptionValue.md) | Its value, when it has one and isn't sensitive. | [core/externalExtensions.ts:898](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L898) |
