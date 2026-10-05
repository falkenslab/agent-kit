# Interface: AgentSpec\<TConfig\>

Defined in: [core/agentSpec.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L73)

Everything actually *about the domain* that `buildSessionOptions()` needs but doesn't
decide itself: which system prompt to build, which MCP servers to talk to besides the
generic human-in-the-loop/knowledge ones this kit already wires up, which local plugin
roots (skills/commands) to load, and which opt-in subagents (if any) to register.

Deliberately not named `AgentDefinition`: the SDK already uses that name for a single
subagent's own definition (`Options.agents: Record<string, AgentDefinition>`), and this
is a level above that — it's what decides *which* subagents get registered, among other
things.

## Type Parameters

| Type Parameter |
| ------ |
| `TConfig` *extends* [`BaseSessionConfig`](BaseSessionConfig.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-disallowedtools"></a> `disallowedTools?` | `string`[] | Tool names to explicitly block regardless of what `canUseTool`/`allowAnyMcpTool` would otherwise allow (e.g. a browser-automation agent blocking "mcp__playwright__browser_run_code_unsafe", which Microsoft's own description calls RCE-equivalent). Confirmed empirically that `disallowedTools` takes full precedence over a permissive `canUseTool` — a disallowed tool never even reaches that callback. | [core/agentSpec.ts:124](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L124) |
| <a id="property-helpguide"></a> `helpGuide?` | `string` | Absolute path of a markdown guide to the agent's own domain (its commands, configuration, folders), which the `agent-help` skill includes. Only with `identity`. | [core/agentSpec.ts:88](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L88) |
| <a id="property-humanapprovaltexts"></a> `humanApprovalTexts?` | `object` | Text for the generic human-approval checkpoint (see tools/humanApproval.ts) — what counts as "publishing something visible to others" is entirely domain-specific. Omit to use this kit's own generic, domain-neutral defaults. | [core/agentSpec.ts:190](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L190) |
| `humanApprovalTexts.approved` | `string` | - | [core/agentSpec.ts:190](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L190) |
| `humanApprovalTexts.description` | `string` | - | [core/agentSpec.ts:190](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L190) |
| `humanApprovalTexts.rejected` | `string` | - | [core/agentSpec.ts:190](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L190) |
| <a id="property-identity"></a> `identity?` | [`AgentIdentity`](AgentIdentity.md) | Who the agent is. With it, the kit tells the model its name, version and what it is, plus agent-kit's version, and offers the `agent-help` skill, which answers how to use the agent: the kit's chat (modes, keys, slash commands, resuming) and `helpGuide`. Without it, neither. | [core/agentSpec.ts:83](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L83) |
| <a id="property-knowledgebase"></a> `knowledgeBase?` | `boolean` | The built-in knowledge base (see knowledge.ts): when `config.knowledgeDir` is set, the kit appends its "Knowledge base" rules to the system prompt and loads its plugin (skills knowledge-ingest/knowledge-query/knowledge-lint, commands /knowledge:ingest, /knowledge:query, /knowledge:lint), so the agent maintains its notes as an interlinked wiki, through the `knowledge_*` tools by default (see `knowledgeTools`). On by default; set `false` for an agent that writes its own rules for `knowledgeDir` (or wants plain notes) — `knowledgePromptSection()`/`knowledgePluginRoot()` are exported to reuse the pieces. | [core/agentSpec.ts:138](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L138) |
| <a id="property-knowledgepagetypes"></a> `knowledgePageTypes?` | [`PageType`](PageType.md)[] | The agent's own page types for the built-in knowledge base, besides the kit's four (summary, concept, entity, synthesis): each with its folder (`""` for the root), index section, description (told to the model) and template. | [core/agentSpec.ts:151](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L151) |
| <a id="property-knowledgetools"></a> `knowledgeTools?` | `"store"` \| `"files"` | How the agent reaches the built-in knowledge base: `"store"` (the default), only through the kit's `knowledge_*` tools over a `KnowledgeStore`, never with the file tools, so the storage can change and the wiki's rules are kept by code (ADR-024); `"files"`, with the file tools on `knowledgeDir` and the rules in the prompt, as before. | [core/agentSpec.ts:145](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L145) |
| <a id="property-manualinterventiontexts"></a> `manualInterventionTexts?` | `object` | Text for the generic manual-intervention checkpoint (see tools/manualLogin.ts), AND this domain's opt-in signal for offering that checkpoint at all: `buildSessionOptions()` only registers `request_manual_login` when this is set (and `mode !== "autonomous"`). Manual intervention only makes sense for a domain that drives some live UI a human could actually step into by hand (a browser window, say) — there's no generic default to fall back to the way there is for `humanApprovalTexts` above, because this kit can't assume every agent built on it has such a UI at all. Leave unset for a domain that doesn't. | [core/agentSpec.ts:201](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L201) |
| `manualInterventionTexts.checkpointLines` | `string`[] | - | [core/agentSpec.ts:205](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L205) |
| `manualInterventionTexts.checkpointQuestion?` | `string` | - | [core/agentSpec.ts:206](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L206) |
| `manualInterventionTexts.checkpointTitle` | `string` | - | [core/agentSpec.ts:204](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L204) |
| `manualInterventionTexts.confirmedMessage` | `string` | - | [core/agentSpec.ts:203](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L203) |
| `manualInterventionTexts.toolDescription` | `string` | - | [core/agentSpec.ts:202](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L202) |
| <a id="property-planmode"></a> `planMode?` | [`PlanModeSpec`](PlanModeSpec.md)\<`TConfig`\> | What the agent may still do in "plan" mode, where it only reads and plans (see hooks/planGate.ts). Without it, the agent can read, search, ask a human and delegate, writes nothing and presents its plan in its reply. | [core/agentSpec.ts:214](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L214) |
| <a id="property-replyinlanguage"></a> `replyInLanguage?` | `boolean` | Whether the kit tells the agent (and each subagent) to reply in the resolved language (`config.language`, `--language`, the system's), following the human if they write in another one. On by default; `false` leaves the reply language to the agent's own prompt. | [core/agentSpec.ts:163](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L163) |
| <a id="property-savetosourcesdescription"></a> `saveToSourcesDescription?` | `string` | Overrides this kit's generic `save_to_sources` tool description (registered whenever `config.sourcesDir` is set) with domain-specific wording. | [core/agentSpec.ts:127](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L127) |
| <a id="property-settingsources"></a> `settingSources?` | `SettingSource`[] | Which filesystem settings the session loads (the SDK's `settingSources`): "project" is the project's `.claude/` (settings, skills, commands) and its CLAUDE.md files, "local" its `.claude/settings.local.json`, "user" the runner's own `~/.claude/` (settings, CLAUDE.md, skills). Default `["project"]`: the runner's personal Claude Code configuration (its `language`, output style, CLAUDE.md, hooks...) never reaches the agent unless asked for with "user" — the SDK's own default loads all three, and the runner's `language` setting then outranked the agent's prompt. `[]` isolates the agent from every settings file, CLAUDE.md included. | [core/agentSpec.ts:175](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L175) |
| <a id="property-skills"></a> `skills?` | `string`[] \| `"all"` | The skills the agent offers (the SDK's `skills`): names, or `plugin:skill` for a plugin's. Default `"all"`, every skill found (the SDK's own, the project's, the plugins'). A list keeps the rest out of each turn's context; the knowledge base's own skills are added to it when the knowledge base is on. A context filter, not a sandbox. | [core/agentSpec.ts:183](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L183) |

## Methods

### buildMcpServers()

```ts
buildMcpServers(config, runDir): Record<string, McpServerConfig>;
```

Defined in: [core/agentSpec.ts:98](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L98)

MCP servers this agent always registers (e.g. Playwright for a browser-driving
agent), on top of the generic ones `buildSessionOptions()` wires up itself when
applicable (human approval, manual intervention, save-to-knowledge) — those aren't
part of the spec because they're driven by `mode` plus this spec's own
`manualInterventionTexts`/`knowledgeDir`/`sourcesDir`, not by anything else
domain-specific.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | `TConfig` |
| `runDir` | `string` |

#### Returns

`Record`\<`string`, `McpServerConfig`\>

***

### buildSubagents()

```ts
buildSubagents(config): 
  | {
  agents: Record<string, SdkSubagentDefinition>;
  allowedSubagentTypes: string[];
}
  | undefined;
```

Defined in: [core/agentSpec.ts:115](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L115)

Opt-in subagents (the SDK's `Options.agents`) this spec wants registered for this
config, plus which `subagent_type` values are therefore allowed to be spawned via the
`Agent` tool (see hooks/subagentTypeGate.ts — the SDK's own built-in
"general-purpose" type is always spawnable regardless of this list, which is exactly
why that gate exists). Returns `undefined` when this config needs no subagents at
all, so `buildSessionOptions()` knows not to grant `Agent`/`Bash` in the first place.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | `TConfig` |

#### Returns

  \| \{
  `agents`: `Record`\<`string`, `SdkSubagentDefinition`\>;
  `allowedSubagentTypes`: `string`[];
\}
  \| `undefined`

***

### buildSystemPrompt()

```ts
buildSystemPrompt(config): string;
```

Defined in: [core/agentSpec.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L75)

The system prompt for this run — everything role/mode/domain-specific lives behind this call.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | `TConfig` |

#### Returns

`string`

***

### knowledgeStore()?

```ts
optional knowledgeStore(config): KnowledgeStore;
```

Defined in: [core/agentSpec.ts:156](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L156)

The knowledge base's store, instead of the kit's over markdown files in `knowledgeDir`
(e.g. a database or a vector store implementing `KnowledgeStore`).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | `TConfig` |

#### Returns

[`KnowledgeStore`](KnowledgeStore.md)

***

### pluginRoots()

```ts
pluginRoots(config): string[];
```

Defined in: [core/agentSpec.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L105)

Local plugin roots (skills/commands, SDK "local" plugin type) to load, in the order
given, when the session has file tools (`config.knowledgeDir`/`config.sourcesDir`). Absolute paths; `buildSessionOptions()`
doesn't know or care where they live on disk.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | `TConfig` |

#### Returns

`string`[]
