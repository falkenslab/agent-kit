# Interface: BaseSessionConfig

Defined in: [core/agentSpec.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L27)

The minimum a config object needs to drive `buildSessionOptions()` — a concrete agent's
own config type (e.g. a `Config`) extends this with whatever domain fields
it needs (a course URL, credentials, ...), which `buildSessionOptions()` itself never
looks at directly: only `AgentSpec`'s methods receive the full concrete config.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-catalogtopics"></a> `catalogTopics?` | `string`[] | The topics of the extensions this agent offers its users (#59), e.g. `["miyagi"]`: the chats' catalog and `extension search` show only those with one of them. Without it, every one. | [core/agentSpec.ts:48](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L48) |
| <a id="property-deniedpaths"></a> `deniedPaths?` | `string`[] | Files or directories the agent must never read, search or write, e.g. a config file holding a password (see hooks/fileScopeGate.ts). | [core/agentSpec.ts:63](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L63) |
| <a id="property-extensiondirs"></a> `extensionDirs?` | [`ExtensionDirs`](ExtensionDirs.md) | Where extensions are installed for this agent (#37): `agent` for all its projects (e.g. `~/.miyagi/extensions`), `project` for this one (e.g. `<projectDir>/extensions`), which wins. The enabled ones whose files match their lock run with the session; `runExtensionCommand()` installs them. | [core/agentSpec.ts:37](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L37) |
| <a id="property-extrareadabledirs"></a> `extraReadableDirs?` | `string`[] | Directories besides `extraWritableDirs` and the extensions' folders the agent may read and search (Read, Glob, Grep), never write. Read and Glob reach nothing else on the disk but what the kit knows the agent needs (see hooks/fileScopeGate.ts). | [core/agentSpec.ts:61](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L61) |
| <a id="property-extrawritabledirs"></a> `extraWritableDirs?` | `string`[] | Directories where the agent reads, searches and writes with the file tools (Write/Edit, scoped — see hooks/fileScopeGate.ts), e.g. a folder of its own notes. Setting one gives the session all five file tools; an extension's folders (the sources, the knowledge base) come with the extension. | [core/agentSpec.ts:55](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L55) |
| <a id="property-language"></a> `language?` | `string` | The language ("en", "es", "fr", "de") the agent replies in and the kit's interface uses. `--language=<code>` on the command line wins over it; without either, the system's language (see language.ts). Pass the same value to the chat, wizard or progress view. | [core/agentSpec.ts:71](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L71) |
| <a id="property-mode"></a> `mode` | [`Mode`](../type-aliases/Mode.md) | - | [core/agentSpec.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L28) |
| <a id="property-officialmarketplace"></a> `officialMarketplace?` | `string` | The agent's own marketplace of extensions (a folder or a git URL, `#ref`): the chats' catalog (`/extensions`, #56) offers what it has, installed without a confirmation, as `runExtensionCommand()`'s `official` does. | [core/agentSpec.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L43) |
| <a id="property-projectdir"></a> `projectDir` | `string` | Project root (the session's cwd): the folder under which the agent's folders and runs live. | [core/agentSpec.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L30) |
| <a id="property-secrets"></a> `secrets?` | `string`[] | Extra values (e.g. a password) to scrub out of the transcript log — see hooks/transcriptLogger.ts. | [core/agentSpec.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L65) |
| <a id="property-timezone"></a> `timeZone?` | `string` | The time zone the date and time tools answer in (`current_time`, `date_math`), an IANA name such as "Europe/Madrid"; the system's if not given. | [core/agentSpec.ts:76](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L76) |
