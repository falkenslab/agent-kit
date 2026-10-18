# Type Alias: ExtensionSwitch

```ts
type ExtensionSwitch = (name, enabled) => Promise<boolean>;
```

Defined in: [core/liveExtensions.ts:95](https://github.com/falkenslab/agent-kit/blob/main/src/core/liveExtensions.ts#L95)

Turns `name` on or off in the running session; false when it can't be done here (it wasn't
running when the session opened, the session hasn't started, or its files changed since it
was installed), and the session must be opened again.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `enabled` | `boolean` |

## Returns

`Promise`\<`boolean`\>
