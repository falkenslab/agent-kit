# Interface: ModeControl

Defined in: [core/modeControl.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/modeControl.ts#L12)

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
| <a id="property-mode"></a> `mode` | `readonly` | [`Mode`](../type-aliases/Mode.md) | - | [core/modeControl.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/core/modeControl.ts#L13) |
| <a id="property-switchable"></a> `switchable` | `readonly` | readonly [`Mode`](../type-aliases/Mode.md)[] | The modes this session can be in, in Shift+Tab's order; fewer than two means it can't switch. | [core/modeControl.ts:15](https://github.com/falkenslab/agent-kit/blob/main/src/core/modeControl.ts#L15) |

## Methods

### set()

```ts
set(next): boolean;
```

Defined in: [core/modeControl.ts:17](https://github.com/falkenslab/agent-kit/blob/main/src/core/modeControl.ts#L17)

Switches to `next` if this session allows it; returns whether it did.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `next` | [`Mode`](../type-aliases/Mode.md) |

#### Returns

`boolean`

***

### subscribe()?

```ts
optional subscribe(listener): () => void;
```

Defined in: [core/modeControl.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/modeControl.ts#L28)

Calls `listener` with the new mode whenever it changes (Shift+Tab, `/plan`, or the agent
leaving plan mode through `present_plan`), so a UI can show it; returns the unsubscribe.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `listener` | (`mode`) => `void` |

#### Returns

() => `void`

***

### takeNotice()?

```ts
optional takeNotice(): string | undefined;
```

Defined in: [core/modeControl.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/modeControl.ts#L23)

The note telling the model it entered or left plan mode, once per change it hasn't been
told about yet; `undefined` otherwise. `createInputQueue({ modeControl })` puts it before
the next message; a caller with its own queue prepends it itself.

#### Returns

`string` \| `undefined`
