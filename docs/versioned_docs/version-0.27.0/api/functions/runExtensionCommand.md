# Function: runExtensionCommand()

```ts
function runExtensionCommand(argv, options): Promise<boolean>;
```

Defined in: [tui/extensionCommand.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/tui/extensionCommand.ts#L62)

The `extension` command an agent exposes in its own binary (#37), e.g. `captain extension add
./jokebook --project`: installs, removes, enables, disables and lists the extensions in its two
scopes. Returns `false` when `argv` isn't this command (so the agent goes on), and sets
`process.exitCode` to 1 on an error.

- `extension list`
- `extension info <name>`: its metadata, what it offers and where its README is
- `extension add <folder | git URL[#ref] | plugin[@marketplace]> [--project] [--path <subfolder>] [--set key=value…] [--yes]`: asks for its options (#55) unless `--set` gives them
- `extension add <folder> --link [--project]`: registered where it is, to develop it (not copied, its files not checked)
- `extension remove <name> [--project | --agent] [--yes | --keep-data]`: asks before deleting its data folder
- `extension enable|disable <name> [--project | --agent]`
- `extension config <name> [key=value… | key… | --unset key… | confirm=on|off|reset] [--project | --agent]`: its options; `key` alone asks for it (without echo when it's a secret); `confirm=` what guided mode asks about its tools (#74, #76)
- `extension update [name] [--yes]`: one installed from a marketplace (or all that have a newer version there) to the version it offers now, its data and options kept
- `extension restore [--trust]`: gets the code a workspace's lock lists and this computer lacks (#57); `--trust` trusts it too
- `extension trust [name…]`: lets a workspace's extensions run, as their code is now
- `extension search [words]`: what the known marketplaces offer
- `extension marketplace add <folder | git URL[#ref] | owner/repo> [--yes]`, `list`, `update [name]`, `remove <name>`

Without a scope, `add` installs into the agent's (the project's when the agent has no scope of
its own); the others act where the extension is, the project's first. The marketplaces live in
the same folder. `official` is the agent's own marketplace (a folder or git URL): known without
asking, and installed from without a confirmation. Any other is added after a warning and
typing its name, and installing from it asks first; `--yes` answers for the person (a script).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `argv` | readonly `string`[] | - |
| `options` | \{ `ask?`: (`question`) => `Promise`\<`string`\>; `askSecret?`: (`question`) => `Promise`\<`string`\>; `catalogTopics?`: `string`[]; `command?`: `string`; `dirs`: [`ExtensionDirs`](../interfaces/ExtensionDirs.md); `official?`: `string`; `write?`: (`line`) => `void`; \} | - |
| `options.ask?` | (`question`) => `Promise`\<`string`\> | Asks the person (a confirmation, an option's value); by default on the terminal, and nothing without one. |
| `options.askSecret?` | (`question`) => `Promise`\<`string`\> | Asks for a secret (a sensitive option), without echo; by default on the terminal. |
| `options.catalogTopics?` | `string`[] | The topics of the extensions `search` shows (#59), as the agent's `catalogTopics`; without it, every one. |
| `options.command?` | `string` | - |
| `options.dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) | - |
| `options.official?` | `string` | The agent's official marketplace: a folder or a git URL (`#ref`). |
| `options.write?` | (`line`) => `void` | - |

## Returns

`Promise`\<`boolean`\>
