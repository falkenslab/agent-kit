# Function: claudeSignedIn()

```ts
function claudeSignedIn(options?): Promise<boolean>;
```

Defined in: [core/claudeAuth.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L60)

Whether the agent can reach Claude: true when the person's environment has `ANTHROPIC_API_KEY`
or `CLAUDE_CODE_OAUTH_TOKEN` (their own setting); otherwise what the Claude Code binary says
(`claude auth status --json`, its `loggedIn`). Never reads the credentials file, and prints
nothing: safe from a server or an Electron main process. False when there is no binary.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ClaudeAuthOptions`](../interfaces/ClaudeAuthOptions.md) |

## Returns

`Promise`\<`boolean`\>
