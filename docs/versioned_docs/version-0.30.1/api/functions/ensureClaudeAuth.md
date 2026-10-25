# Function: ensureClaudeAuth()

```ts
function ensureClaudeAuth(config?, options?): Promise<string | undefined>;
```

Defined in: [tui/claudeAuth.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/tui/claudeAuth.ts#L73)

The terminal-facing counterpart to `resolveClaudeAuth()` (core/claudeAuth.ts), which only
*looks up* a token. This one also gets you one: if `resolveClaudeAuth(config)` comes back
empty, it prints why, offers to run "claude setup-token" interactively, and sets the
result on `process.env.CLAUDE_CODE_OAUTH_TOKEN` for this run. Exits the process if the
user declines or cancels — there's no agent to run without a token.

Persisting a freshly-generated token across runs is *not* this function's job — unlike an
earlier version, this kit owns no config-file storage of its own (see git history). When
the interactive flow does generate one, it's returned so the caller can save it wherever
it wants (a file, an OS keychain, ...) and pass it back in as `config.claudeCodeOAuthToken`
next time; returns `undefined` when auth was already resolved (an env var, or the `config`
passed in) and nothing new was generated.

Only makes sense with a real terminal in front of a human (a `runWizard()` confirm, colored console
output), which is why it lives here rather than in the non-interactive core.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`ClaudeAuthConfig`](../interfaces/ClaudeAuthConfig.md) |
| `options` | \{ `language?`: `string`; \} |
| `options.language?` | `string` |

## Returns

`Promise`\<`string` \| `undefined`\>
