# Interface: FileScope

Defined in: [core/hooks/fileScopeGate.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L10)

Where the built-in file tools may act. Without this, the only boundary is the SDK's own
working-directory scope — the whole project directory — so keeping the agent out of the
user's own files (a config file holding a password, the originals in sources/) would rest on the system
prompt alone.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-alsoreadable"></a> `alsoReadable?` | `string`[] | Readable too with `readableDirs`, but not named in a denial: the run folder, the plugin roots. | [core/hooks/fileScopeGate.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L34) |
| <a id="property-deniedpaths"></a> `deniedPaths` | `string`[] | Never readable, searchable or writable. | [core/hooks/fileScopeGate.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L20) |
| <a id="property-projectdir"></a> `projectDir` | `string` | Base for relative paths: the session's cwd. | [core/hooks/fileScopeGate.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L12) |
| <a id="property-readabledirs"></a> `readableDirs?` | `string`[] | With it, `Read` and `Glob` are only allowed inside these (an allow-list, like `writableDirs` and `searchableDirs`), plus `alsoReadable` and the tool results under `toolResultsRoot`; `deniedPaths` still wins. Without it, they reach any path but the denied ones: any file the user can read, `~/.ssh` included. | [core/hooks/fileScopeGate.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L32) |
| <a id="property-readonlydirs"></a> `readOnlyDirs?` | `string`[] | Readable and searchable but never writable; only affects the wording of the denial. | [core/hooks/fileScopeGate.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L16) |
| <a id="property-searchabledirs"></a> `searchableDirs` | `string`[] | Grep is only allowed inside these — it prints file contents, so it isn't let loose on the whole project. | [core/hooks/fileScopeGate.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L18) |
| <a id="property-toolonlydirs"></a> `toolOnlyDirs?` | `object`[] | Reached only through the kit's own tools, never the file tools: the knowledge folder when the agent has the `knowledge_*` tools (ADR-024). The denial says what to use instead. | [core/hooks/fileScopeGate.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L25) |
| <a id="property-toolresultsroot"></a> `toolResultsRoot?` | `string` | The CLI's folder for this project (`~/.claude/projects/<project>`): with `readableDirs`, its sessions' `tool-results/` folders, where the SDK leaves large tool outputs for the agent to `Read`, are readable; nothing else in it. | [core/hooks/fileScopeGate.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L40) |
| <a id="property-writabledirs"></a> `writableDirs` | `string`[] | Write/Edit are only allowed inside these. | [core/hooks/fileScopeGate.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/fileScopeGate.ts#L14) |
