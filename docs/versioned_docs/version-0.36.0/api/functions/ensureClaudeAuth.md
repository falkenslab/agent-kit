# Function: ensureClaudeAuth()

```ts
function ensureClaudeAuth(options?): Promise<void>;
```

Defined in: [tui/claudeAuth.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/tui/claudeAuth.ts#L32)

Makes sure the agent can reach Claude before a terminal chat starts: returns at once when
`claudeSignedIn()` says so (an API key or the person's own token in the environment, or a
Claude Code sign-in). Otherwise it says why, asks whether to sign in, and runs Claude Code's
own `claude auth login` (the binary the Agent SDK ships) on this terminal: Anthropic's page in
the browser, the code it shows pasted here. The binary keeps the credentials; nothing is
returned or stored (ADR-009: Anthropic's terms forbid an agent collecting them). Exits the
process when the person declines or the sign-in doesn't complete: there's no agent to run
without Claude.

Only makes sense with a terminal in front of a person (a `runWizard()` confirm, colored
output); a host without one uses `startClaudeSignIn()` from the core.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `language?`: `string`; \} |
| `options.language?` | `string` |

## Returns

`Promise`\<`void`\>
