# Function: createTranscriptLogger()

```ts
function createTranscriptLogger(transcriptPath, secrets?): TranscriptLogger;
```

Defined in: [core/hooks/transcriptLogger.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L30)

Logs every tool call (request + result) as one JSON line, redacting `secrets` (e.g. a
domain-specific password — see `BaseSessionConfig.secrets`) plus
`CLAUDE_CODE_OAUTH_TOKEN` when the person's environment sets one, which this kit always
scrubs regardless of domain (it never handles a token itself: see claudeAuth.ts).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `transcriptPath` | `string` | `undefined` |
| `secrets` | readonly `string`[] | `[]` |

## Returns

[`TranscriptLogger`](../interfaces/TranscriptLogger.md)
