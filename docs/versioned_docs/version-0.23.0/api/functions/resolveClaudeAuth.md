# Function: resolveClaudeAuth()

```ts
function resolveClaudeAuth(config?): boolean;
```

Defined in: [core/claudeAuth.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L26)

Pure lookup, no I/O and no console output of any kind — safe to call from a
headless/non-interactive consumer (a server, an Electron main process) as much as from a
terminal one.

Checks, in order: `ANTHROPIC_API_KEY` (a complete authentication path on its own — API
billing instead of subscription, so nothing else is checked when it's set),
`CLAUDE_CODE_OAUTH_TOKEN`, then `config.claudeCodeOAuthToken` if the caller passed one.
Returns `true` and (for the `config` case) sets `CLAUDE_CODE_OAUTH_TOKEN` on the process
as a side effect once a token is found — the SDK's own subprocess reads that env var
directly, never anything this kit passes it explicitly; `false` when none of the three
has one. Getting a token in that case (e.g. by walking the user through
`claude setup-token`) is a terminal-UX concern, not this function's — see
`ensureClaudeAuth()` in tui/claudeAuth.ts, which calls this first and only falls back to
that interactive flow when it returns `false`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`ClaudeAuthConfig`](../interfaces/ClaudeAuthConfig.md) |

## Returns

`boolean`
