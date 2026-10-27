# Interface: ClaudeAuthConfig

Defined in: [core/claudeAuth.ts:2](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L2)

What `resolveClaudeAuth()` and `ensureClaudeAuth()` accept besides the environment.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-claudecodeoauthtoken"></a> `claudeCodeOAuthToken?` | `string` | A previously-resolved token the caller already has (from wherever it stores one, if anywhere) — this module owns no persistence of its own, unlike an earlier version that read/wrote `~/.<appName>/config.json` itself (see git history). Sourcing this value across runs, if a concrete agent wants that at all, is entirely its own concern. | [core/claudeAuth.ts:7](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L7) |
