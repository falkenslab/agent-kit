# Function: awareness()

```ts
function awareness(options?): Extension;
```

Defined in: [extensions/awareness/index.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/extensions/awareness/index.ts#L42)

The awareness (#43): the agent knows who it is and what it is at each moment of a session,
and the person can ask it. A "Who you are" section, `about_me` (the session's facts, read
anew on every call through `ExtensionContext.session()`, and the agent's `guide`), and
the `help` skill, how the kit's chat is used, which doesn't change. It needs the spec's
`identity`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AwarenessOptions`](../interfaces/AwarenessOptions.md) |

## Returns

[`Extension`](../interfaces/Extension.md)
