# Function: canOpenBrowser()

```ts
function canOpenBrowser(env?, platform?): boolean;
```

Defined in: [core/openBrowser.ts:7](https://github.com/falkenslab/agent-kit/blob/main/src/core/openBrowser.ts#L7)

Whether a browser can be opened on this computer (#72): not over SSH, nor on Linux without a
display (a server, a container). Elsewhere the desktop is there.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `env` | `ProcessEnv` | `process.env` |
| `platform` | `Platform` | `process.platform` |

## Returns

`boolean`
