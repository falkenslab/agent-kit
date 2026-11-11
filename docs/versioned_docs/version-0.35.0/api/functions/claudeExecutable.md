# Function: claudeExecutable()

```ts
function claudeExecutable(
   resolve?, 
   platform?, 
   arch?
): string | undefined;
```

Defined in: [core/claudeAuth.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L25)

The Claude Code binary the Agent SDK ships (`@anthropic-ai/claude-agent-sdk-<platform>-<arch>`),
unmodified: the copy unpacked next to the archive when the agent runs packaged, or else the
one resolved from `node_modules` as the SDK resolves it. `undefined` when it isn't installed.
`resolve` and the platform are replaceable for tests.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `resolve` | (`request`) => `string` | `...` |
| `platform` | `Platform` | `process.platform` |
| `arch` | `string` | `process.arch` |

## Returns

`string` \| `undefined`
