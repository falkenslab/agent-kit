# Function: createTranscriptLogger()

```ts
function createTranscriptLogger(transcriptPath, secrets?): TranscriptLogger;
```

Defined in: [core/hooks/transcriptLogger.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L28)

Logs every tool call (request + result) as one JSON line, redacting `secrets` (e.g. a
domain-specific password — see `BaseSessionConfig.secrets`) plus
`CLAUDE_CODE_OAUTH_TOKEN`, which this kit always scrubs regardless of domain since it
owns the auth-token concept (see claudeAuth.ts).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `transcriptPath` | `string` | `undefined` |
| `secrets` | readonly `string`[] | `[]` |

## Returns

[`TranscriptLogger`](../interfaces/TranscriptLogger.md)
