# Function: openBrowser()

```ts
function openBrowser(url): Promise<boolean>;
```

Defined in: [core/openBrowser.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/openBrowser.ts#L19)

Opens an `http(s)` address in this computer's browser, with the system's own opener and no
shell (an OAuth link is full of `&`, which `cmd /c start` would cut): `rundll32` on Windows,
`open` on macOS, `xdg-open` elsewhere. False when it can't (`canOpenBrowser()`, another kind
of address, no opener): then the person is given the link only.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `url` | `string` |

## Returns

`Promise`\<`boolean`\>
