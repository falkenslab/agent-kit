# Interface: ModeControl

Defined in: [core/session.ts:213](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L213)

The supervision mode of a running session. Only "guided" and "interactive" can switch into
each other: they share the same tools (the approval tool) and the step gate is registered
in both, asking only in "interactive". "autonomous" has no approval tool at all, and a tool
can't appear or vanish mid-session, so a session that starts autonomous stays autonomous,
and one that doesn't can't become autonomous. The system prompt keeps the mode it was
built with.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-mode"></a> `mode` | `readonly` | [`Mode`](../type-aliases/Mode.md) | - | [core/session.ts:214](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L214) |
| <a id="property-switchable"></a> `switchable` | `readonly` | readonly [`Mode`](../type-aliases/Mode.md)[] | The modes this session can be in; fewer than two means it can't switch. | [core/session.ts:216](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L216) |

## Methods

### set()

```ts
set(next): boolean;
```

Defined in: [core/session.ts:218](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L218)

Switches to `next` if this session allows it; returns whether it did.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `next` | [`Mode`](../type-aliases/Mode.md) |

#### Returns

`boolean`
