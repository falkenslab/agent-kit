# Interface: ModeControl

Defined in: [core/session.ts:233](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L233)

The supervision mode of a running session. "guided", "interactive" and "plan" switch into
one another: they share the same tools (the approval tool), and the step gate and the plan
gate are registered in all three, deciding only in their own mode. "autonomous" has no
approval tool at all, and a tool can't appear or vanish mid-session, so a session that
starts autonomous stays autonomous, and one that doesn't can't become autonomous. The
system prompt keeps the mode it was built with, so entering or leaving plan mode is told
to the model with the next message instead (`takeNotice()`).

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-mode"></a> `mode` | `readonly` | [`Mode`](../type-aliases/Mode.md) | - | [core/session.ts:234](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L234) |
| <a id="property-switchable"></a> `switchable` | `readonly` | readonly [`Mode`](../type-aliases/Mode.md)[] | The modes this session can be in, in Shift+Tab's order; fewer than two means it can't switch. | [core/session.ts:236](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L236) |

## Methods

### set()

```ts
set(next): boolean;
```

Defined in: [core/session.ts:238](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L238)

Switches to `next` if this session allows it; returns whether it did.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `next` | [`Mode`](../type-aliases/Mode.md) |

#### Returns

`boolean`

***

### takeNotice()?

```ts
optional takeNotice(): string | undefined;
```

Defined in: [core/session.ts:244](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L244)

The note telling the model it entered or left plan mode, once per change it hasn't been
told about yet; `undefined` otherwise. `createInputQueue({ modeControl })` puts it before
the next message; a caller with its own queue prepends it itself.

#### Returns

`string` \| `undefined`
