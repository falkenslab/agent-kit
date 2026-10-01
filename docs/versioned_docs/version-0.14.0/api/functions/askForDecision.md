# Function: askForDecision()

```ts
function askForDecision(runDir, prompt): Promise<string>;
```

Defined in: [core/hooks/humanInput.ts:17](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/humanInput.ts#L17)

Asks the human for a decision through two channels in parallel, whichever answers
first wins: (1) the installed `InteractionPort` (the keyboard, for a person running the
process in their own terminal, see tui/terminalInteraction.ts), and (2) a response file,
for when something else (e.g. Claude Code, or a non-terminal host driving its own UI —
an Electron main process, a Tauri sidecar) is piloting the run and has no interactive
stdin to write to.

Returns the answer lowercased and trimmed ("", "y", "n", "q"...).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runDir` | `string` |
| `prompt` | [`ApprovalPrompt`](../interfaces/ApprovalPrompt.md) |

## Returns

`Promise`\<`string`\>
