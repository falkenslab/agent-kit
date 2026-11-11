# Interface: TranscriptLogger

Defined in: [core/hooks/transcriptLogger.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L10)

The hooks that write `transcript.jsonl`: register `preToolUse` as a `PreToolUse` hook, `postToolUse` as a `PostToolUse` one and `postToolUseFailure` as a `PostToolUseFailure` one.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-posttooluse"></a> `postToolUse` | `HookCallback` | - | [core/hooks/transcriptLogger.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L12) |
| <a id="property-posttoolusefailure"></a> `postToolUseFailure` | `HookCallback` | A call that failed (#96): it fires instead of `PostToolUse`, and without it the record ends at the call. | [core/hooks/transcriptLogger.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L14) |
| <a id="property-pretooluse"></a> `preToolUse` | `HookCallback` | - | [core/hooks/transcriptLogger.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L11) |

## Methods

### note()

```ts
note(event, entry): Promise<void>;
```

Defined in: [core/hooks/transcriptLogger.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/transcriptLogger.ts#L16)

Another event the kit keeps in it (a gate's answer, #74): one line, with its time.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `string` |
| `entry` | `Record`\<`string`, `unknown`\> |

#### Returns

`Promise`\<`void`\>
