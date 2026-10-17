# Function: describeCapability()

```ts
function describeCapability(capability, language): DescribedCapability;
```

Defined in: [core/extensions.ts:157](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L157)

A capability's texts in `language`: English when it has none there, then any it has, then its id.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `capability` | [`ExtensionCapability`](../interfaces/ExtensionCapability.md) |
| `language` | [`Language`](../type-aliases/Language.md) |

## Returns

[`DescribedCapability`](../interfaces/DescribedCapability.md)
