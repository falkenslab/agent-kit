# Function: runExtensionCommand()

```ts
function runExtensionCommand(argv, options): Promise<boolean>;
```

Defined in: [tui/extensionCommand.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/tui/extensionCommand.ts#L30)

The `extension` command an agent exposes in its own binary (#37), e.g. `captain extension add
./jokebook --project`: installs, removes, enables, disables and lists the extensions in its two
scopes. Returns `false` when `argv` isn't this command (so the agent goes on), and sets
`process.exitCode` to 1 on an error.

- `extension list`
- `extension info <name>`: its metadata, what it offers and where its README is
- `extension add <folder | git URL[#ref]> [--project] [--path <subfolder>]`
- `extension remove|enable|disable <name> [--project | --agent]`

Without a scope, `add` installs into the agent's (the project's when the agent has no scope of
its own); the others act where the extension is, the project's first.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `argv` | readonly `string`[] |
| `options` | \{ `command?`: `string`; `dirs`: [`ExtensionDirs`](../interfaces/ExtensionDirs.md); `write?`: (`line`) => `void`; \} |
| `options.command?` | `string` |
| `options.dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `options.write?` | (`line`) => `void` |

## Returns

`Promise`\<`boolean`\>
