# Function: createStepGate()

```ts
function createStepGate(
   runDir, 
   isActive?, 
   selfAskingTools?, 
   labels?
): HookCallback;
```

Defined in: [core/hooks/stepGate.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/stepGate.ts#L25)

PreToolUse hook for "interactive" mode: pauses before every action and asks for
confirmation (by keyboard or by file, see humanInput.ts), like reviewing a plan step
by step.

`isActive` lets one session switch between "guided" and "interactive" while it runs (see
session.ts's `ModeControl`): the hook stays registered and, while inactive, gives no
decision at all, so the tool call goes on exactly as if the hook weren't there.

The panel says the call as the chat does (#88), in the person's language: the session's
labels (`labels`: the extensions'), else the kit's for its own tools, then the tool's name and
its parameters in one line, cut short; the person approving needn't read JSON.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `runDir` | `string` | `undefined` |
| `isActive` | () => `boolean` | `...` |
| `selfAskingTools` | readonly `string`[] | `[]` |
| `labels` | () => \| `Readonly`\<`Record`\<`string`, [`ToolLabel`](../interfaces/ToolLabel.md)\>\> \| `undefined` | `...` |

## Returns

`HookCallback`
