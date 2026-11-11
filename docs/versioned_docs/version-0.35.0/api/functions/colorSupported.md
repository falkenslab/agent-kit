# Function: colorSupported()

```ts
function colorSupported(env?, isTTY?): boolean;
```

Defined in: [tui/theme.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L91)

Whether the terminal UI colors what it writes: when stdout is a terminal (and not a `dumb`
one), `NO_COLOR` turning it off and `FORCE_COLOR` on (off for `0` or `false`). Not picocolors'
`isColorSupported`, which is true on Windows whatever stdout is (#95): a run redirected to a
file got a log full of escape codes there.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `env` | `ProcessEnv` | `process.env` |
| `isTTY` | `boolean` | `...` |

## Returns

`boolean`
