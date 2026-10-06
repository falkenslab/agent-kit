# Function: buildSessionOptions()

```ts
function buildSessionOptions<TConfig>(
   config, 
   runDir, 
   spec, 
   options?
): Promise<{
  knowledgeStore?: KnowledgeStore;
  language: Language;
  modeControl: ModeControl;
  options: Options;
  transcriptLogger: TranscriptLogger;
  transcriptPath: string;
}>;
```

Defined in: [core/session.ts:48](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L48)

Builds the `options` object passed to the Agent SDK's `query()` — everything about
*how* the agent runs a session (system prompt, tools, MCP servers, hooks), independent
of *what* is said to start it off (that's the caller's `prompt`, a plain string for a
one-shot run or an `AsyncIterable` for a multi-turn chat).

Everything actually *about the domain* (which system prompt, which MCP servers besides
the generic human-in-the-loop/knowledge ones below, which plugin roots, which
subagents) is behind `spec` (see agentSpec.ts) — this function only knows the generic
fields on `BaseSessionConfig`.

The per-mode behavioral differences (whether the approval/manual-intervention tools
exist, whether the interactive step gate or the plan gate decides) all fall out of
`config.mode` and the session's `ModeControl` alone.

`options.run` keeps the SDK's transcript of the conversation in that run folder (see
runs.ts's createRunStore()) and, when it has a session already, resumes it: the chat
passes it when the agent gives it a runs folder (`InkChatOptions.runsDir`).

## Type Parameters

| Type Parameter |
| ------ |
| `TConfig` *extends* [`BaseSessionConfig`](../interfaces/BaseSessionConfig.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | `TConfig` |
| `runDir` | `string` |
| `spec` | [`AgentSpec`](../interfaces/AgentSpec.md)\<`TConfig`\> |
| `options` | \{ `autoCompactEnabled?`: `boolean`; `run?`: [`RunFolder`](../interfaces/RunFolder.md); \} |
| `options.autoCompactEnabled?` | `boolean` |
| `options.run?` | [`RunFolder`](../interfaces/RunFolder.md) |

## Returns

`Promise`\<\{
  `knowledgeStore?`: [`KnowledgeStore`](../interfaces/KnowledgeStore.md);
  `language`: [`Language`](../type-aliases/Language.md);
  `modeControl`: [`ModeControl`](../interfaces/ModeControl.md);
  `options`: `Options`;
  `transcriptLogger`: [`TranscriptLogger`](../interfaces/TranscriptLogger.md);
  `transcriptPath`: `string`;
\}\>
