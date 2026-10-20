# Type Alias: SessionOpener

```ts
type SessionOpener = (run) => Promise<
  | Options
  | {
  apis?: Record<string, Record<string, unknown>>;
  extensionAuth?: ExtensionAuth;
  extensions?: ExtensionsStatus;
  modeControl?: ModeControl;
  options: Options;
  restartExtension?: ExtensionRestart;
  switchExtension?: ExtensionSwitch;
  toolLabels?: ToolLabels;
}>;
```

Defined in: [chat/runs.ts:15](https://github.com/falkenslab/agent-kit/blob/main/src/chat/runs.ts#L15)

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
  `apis?`: `Record`\<`string`, `Record`\<`string`, `unknown`\>\>;
  `extensionAuth?`: [`ExtensionAuth`](../interfaces/ExtensionAuth.md);
  `extensions?`: [`ExtensionsStatus`](../interfaces/ExtensionsStatus.md);
  `modeControl?`: [`ModeControl`](../interfaces/ModeControl.md);
  `options`: `Options`;
  `restartExtension?`: [`ExtensionRestart`](ExtensionRestart.md);
  `switchExtension?`: [`ExtensionSwitch`](ExtensionSwitch.md);
  `toolLabels?`: [`ToolLabels`](ToolLabels.md);
\}\>
