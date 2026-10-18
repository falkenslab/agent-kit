# Function: checkFileScope()

```ts
function checkFileScope(
   scope, 
   toolName, 
   input
): string | undefined;
```

Defined in: [core/hooks/fileScopeGate.ts:81](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L81)

The reason to deny `toolName` with `input` under `scope`, or `undefined` to let it
through. Tools other than Read/Write/Edit/Grep/Glob are never judged here, and a call
without a path is left for the tool itself to reject.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | [`FileScope`](../interfaces/FileScope.md) |
| `toolName` | `string` |
| `input` | `Record`\<`string`, `unknown`\> |

## Returns

`string` \| `undefined`
