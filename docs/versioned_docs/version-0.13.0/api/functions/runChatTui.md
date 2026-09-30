# Function: runChatTui()

```ts
function runChatTui(options, tuiOptions?): Promise<void>;
```

Defined in: [tui/chatTui.ts:195](https://github.com/falkenslab/agent-kit/blob/main/src/tui/chatTui.ts#L195)

A ready-to-run interactive terminal chat loop, assembled from this kit's own chat
primitives: `createInputQueue()` feeds typed lines into a multi-turn `query()` session,
`runQuery()`'s normalized event stream is rendered to the console (streamed text,
friendly action labels via `createFriendlyToolLabel()`, turn failures), and this loop's
own `readline.Interface` is registered via `setSharedReadline()` so any human-in-the-loop
checkpoint the session hits (the interactive-mode step gate, or the guided-mode approval/
manual-login tools — see terminalInteraction.ts) prompts on the same interface instead of a
second one fighting it for stdin's raw mode.

Takes the SDK `Options` produced by `buildSessionOptions()` rather than an `AgentSpec`
directly, so it stays reusable for an `Options` assembled any other way:

  const { options } = await buildSessionOptions(config, runDir, spec);
  await runChatTui(options, { welcomeMessage: "Ready. Type /exit to quit." });

or, to keep each run's conversation in its folder and resume it (see `runsDir`):

  await runChatTui((run) => buildSessionOptions(config, run.dir, spec, { run }), { runsDir });

Resolves once the chat ends (an exit command, Ctrl+C/Ctrl+D at an idle prompt) — this
function owns the whole session lifecycle, closing the underlying query and readline
interface itself before returning.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `Options` \| [`SessionOpener`](../type-aliases/SessionOpener.md) |
| `tuiOptions` | [`ChatTuiOptions`](../interfaces/ChatTuiOptions.md) |

## Returns

`Promise`\<`void`\>
