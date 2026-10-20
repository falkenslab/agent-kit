# Interface: TranscriptLogger

Defined in: [core/hooks/transcriptLogger.ts:9](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L9)

The two hooks that write `transcript.jsonl`: register `preToolUse` as a `PreToolUse` hook and `postToolUse` as a `PostToolUse` one.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-posttooluse"></a> `postToolUse` | `HookCallback` | [core/hooks/transcriptLogger.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L11) |
| <a id="property-pretooluse"></a> `preToolUse` | `HookCallback` | [core/hooks/transcriptLogger.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L10) |

## Methods

### note()

```ts
note(event, entry): Promise<void>;
```

Defined in: [core/hooks/transcriptLogger.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L13)

Another event the kit keeps in it (a gate's answer, #74): one line, with its time.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `entry` | `Record`\<`string`, `unknown`\> |

#### Returns

`Promise`\<`void`\>
