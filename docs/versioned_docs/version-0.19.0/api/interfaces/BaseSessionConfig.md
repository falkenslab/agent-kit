# Interface: BaseSessionConfig

Defined in: [core/agentSpec.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L28)

The minimum a config object needs to drive `buildSessionOptions()` — a concrete agent's
own config type (e.g. a `Config`) extends this with whatever domain fields
it needs (a course URL, credentials, ...), which `buildSessionOptions()` itself never
looks at directly: only `AgentSpec`'s methods receive the full concrete config.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-deniedpaths"></a> `deniedPaths?` | `string`[] | Files or directories the agent must never read, search or write, e.g. a config file holding a password (see hooks/fileScopeGate.ts). | [core/agentSpec.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L67) |
| <a id="property-extensiondirs"></a> `extensionDirs?` | [`ExtensionDirs`](ExtensionDirs.md) | Where extensions are installed for this agent (#37): `agent` for all its projects (e.g. `~/.miyagi/extensions`), `project` for this one (e.g. `<projectDir>/extensions`), which wins. The enabled ones whose files match their lock run with the session; `runExtensionCommand()` installs them. | [core/agentSpec.ts:57](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L57) |
| <a id="property-extrareadabledirs"></a> `extraReadableDirs?` | `string`[] | Directories besides `sourcesDir`/`extraWritableDirs` the agent may read and search (Read, Glob, Grep), never write. Read and Glob reach nothing else on the disk but what the kit knows the agent needs (see hooks/fileScopeGate.ts). | [core/agentSpec.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L65) |
| <a id="property-extrawritabledirs"></a> `extraWritableDirs?` | `string`[] | Directories besides `knowledgeDir`/`sourcesDir` where Write/Edit are allowed (see hooks/fileScopeGate.ts). | [core/agentSpec.ts:59](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L59) |
| <a id="property-knowledgedir"></a> `knowledgeDir?` | `string` | Where the agent writes its own notes (the "wiki"). Setting this or `sourcesDir` is what gives the session the file tools (Read/Write/Edit/Glob/Grep, scoped — see hooks/fileScopeGate.ts); without either, the agent has no file access at all. | [core/agentSpec.ts:37](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L37) |
| <a id="property-language"></a> `language?` | `string` | The language ("en", "es", "fr", "de") the agent replies in and the kit's interface uses. `--language=<code>` on the command line wins over it; without either, the system's language (see language.ts). Pass the same value to the chat, wizard or progress view. | [core/agentSpec.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L75) |
| <a id="property-memorydir"></a> `memoryDir?` | `string` | The memory of the person (the `memory` extension, #34): a folder of the agent's own outside any project, e.g. `~/.miyagi/memory`, kept across all the person's projects. Never share it with another agent. The extension needs it; only its tools (`recall`, `remember`, `forget`) reach it. | [core/agentSpec.ts:50](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L50) |
| <a id="property-mode"></a> `mode` | [`Mode`](../type-aliases/Mode.md) | - | [core/agentSpec.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L29) |
| <a id="property-projectdir"></a> `projectDir` | `string` | Project root (the session's cwd): the folder under which the agent's notes, sources and runs live. | [core/agentSpec.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L31) |
| <a id="property-secrets"></a> `secrets?` | `string`[] | Extra values (e.g. a password) to scrub out of the transcript log — see hooks/transcriptLogger.ts. | [core/agentSpec.ts:69](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L69) |
| <a id="property-sourcesdir"></a> `sourcesDir?` | `string` | Original files, kept as obtained and apart from the notes in `knowledgeDir`: material the user drops in, plus whatever the agent saves with `save_to_sources` (downloaded documents, transcripts...). The agent can read and search it but never edit it — Write/ Edit are scoped to `knowledgeDir` — and `save_to_sources` never overwrites. | [core/agentSpec.ts:44](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L44) |
| <a id="property-timezone"></a> `timeZone?` | `string` | The time zone the date and time tools answer in (`current_time`, `date_math`), an IANA name such as "Europe/Madrid"; the system's if not given. | [core/agentSpec.ts:80](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L80) |
