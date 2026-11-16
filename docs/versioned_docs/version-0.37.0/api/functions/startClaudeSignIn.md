# Function: startClaudeSignIn()

```ts
function startClaudeSignIn(options?): ClaudeSignIn;
```

Defined in: [core/claudeAuth.ts:100](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L100)

Signs the person in to their Claude account through Anthropic's own flow, for a host without a
terminal (a web page, a desktop app): runs `claude auth login` (`console: true` for an
Anthropic Console account, billed by API usage) with plain pipes. The binary opens the browser
itself; the host shows `url` as a link in case it didn't, and a box for the code Anthropic's
page shows (`sendCode`). The binary keeps the credentials: the kit never sees a token. Throws
when the binary isn't installed.

Confirmed empirically (Claude Code 2.1.310): without a TTY, `auth login` prints "If the browser
didn't open, visit: <url>" (the URL may come wrapped in OSC 8 hyperlink escapes) and then waits
at "Paste code here if prompted >".

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ClaudeAuthOptions`](../interfaces/ClaudeAuthOptions.md) & `object` |

## Returns

[`ClaudeSignIn`](../interfaces/ClaudeSignIn.md)
