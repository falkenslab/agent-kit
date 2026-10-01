# Interface: BaseSessionConfig

Defined in: [core/agentSpec.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L25)

The minimum a config object needs to drive `buildSessionOptions()` — a concrete agent's
own config type (e.g. a `Config`) extends this with whatever domain fields
it needs (a course URL, credentials, ...), which `buildSessionOptions()` itself never
looks at directly: only `AgentSpec`'s methods receive the full concrete config.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-deniedpaths"></a> `deniedPaths?` | `string`[] | Files or directories the agent must never read, search or write, e.g. a config file holding a password (see hooks/fileScopeGate.ts). | [core/agentSpec.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L45) |
| <a id="property-extrawritabledirs"></a> `extraWritableDirs?` | `string`[] | Directories besides `knowledgeDir`/`sourcesDir` where Write/Edit are allowed (see hooks/fileScopeGate.ts). | [core/agentSpec.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L43) |
| <a id="property-knowledgedir"></a> `knowledgeDir?` | `string` | Where the agent writes its own notes (the "wiki"). Setting this or `sourcesDir` is what gives the session the file tools (Read/Write/Edit/Glob/Grep, scoped — see hooks/fileScopeGate.ts); without either, the agent has no file access at all. | [core/agentSpec.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L34) |
| <a id="property-language"></a> `language?` | `string` | The language ("en", "es", "fr", "de") the agent replies in and the kit's interface uses. `--language=<code>` on the command line wins over it; without either, the system's language (see language.ts). Pass the same value to the chat, wizard or progress view. | [core/agentSpec.ts:53](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L53) |
| <a id="property-mode"></a> `mode` | [`Mode`](../type-aliases/Mode.md) | - | [core/agentSpec.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L26) |
| <a id="property-projectdir"></a> `projectDir` | `string` | Project root (the session's cwd): the folder under which the agent's notes, sources and runs live. | [core/agentSpec.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L28) |
| <a id="property-secrets"></a> `secrets?` | `string`[] | Extra values (e.g. a password) to scrub out of the transcript log — see hooks/transcriptLogger.ts. | [core/agentSpec.ts:47](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L47) |
| <a id="property-sourcesdir"></a> `sourcesDir?` | `string` | Original files, kept as obtained and apart from the notes in `knowledgeDir`: material the user drops in, plus whatever the agent saves with `save_to_sources` (downloaded documents, transcripts...). The agent can read and search it but never edit it — Write/ Edit are scoped to `knowledgeDir` — and `save_to_sources` never overwrites. | [core/agentSpec.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L41) |
