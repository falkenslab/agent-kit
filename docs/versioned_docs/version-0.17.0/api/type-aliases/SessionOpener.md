# Type Alias: SessionOpener

```ts
type SessionOpener = (run) => Promise<
  | Options
  | {
  modeControl?: ModeControl;
  options: Options;
}>;
```

Defined in: [tui/runs.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/tui/runs.ts#L13)

Builds the session's options for a run folder, e.g.
`(run) => buildSessionOptions(config, run.dir, spec, { run })`: called for the first run
and again for each one resumed with /resume (MCP servers, the step gate and the transcript
are bound to the run's folder, so they're built anew).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `run` | [`RunFolder`](../interfaces/RunFolder.md) |

## Returns

`Promise`\<
  \| `Options`
  \| \{
  `modeControl?`: [`ModeControl`](../interfaces/ModeControl.md);
  `options`: `Options`;
\}\>
