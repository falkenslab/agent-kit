---
sidebar_position: 5
title: Session options
description: Exactly what buildSessionOptions() builds, option by option, and what it returns.
---

# Session options

```ts
function buildSessionOptions<TConfig extends BaseSessionConfig>(
  config: TConfig,
  runDir: string,
  spec: AgentSpec<TConfig>,
  options?: { autoCompactEnabled?: boolean; run?: RunFolder },
): Promise<{
  options: Options; // for the SDK's query()
  transcriptLogger: TranscriptLogger;
  transcriptPath: string; // <runDir>/transcript.jsonl
  modeControl: ModeControl;
  language: Language; // the resolved language
}>;
```

- **`config`**: your [session config](session-config.md).
- **`runDir`**: this run's folder. The transcript, the response file and the kit's MCP servers use it. With a runs folder, pass the folder the chat gives your opener (`run.dir`).
- **`spec`**: your [`AgentSpec`](agent-spec.md).
- **`options.autoCompactEnabled`**: the SDK's automatic context compaction; `true` by default.
- **`options.run`**: keeps the SDK's transcript in the run folder and resumes its session if it has one. See [Runs and resuming](../sessions/runs-and-resuming.md).

## What goes into `Options`

### System prompt

`spec.buildSystemPrompt(config)`, then the [knowledge base section](../capabilities/knowledge-base.md) if `config.knowledgeDir` is set and `spec.knowledgeBase !== false`, then the [reply language line](../sessions/languages.md) unless `spec.replyInLanguage === false`.

### Tools

`tools` (what exists) and `allowedTools` (what's pre-approved) are the same list, built from the configuration:

| Condition | Tools added |
| --- | --- |
| always | `WebFetch`, `WebSearch`, `TodoWrite` |
| `knowledgeDir` or `sourcesDir` | `Read`, `Write`, `Edit`, `Glob`, `Grep`; with the built-in knowledge base reached through its tools (the default), only `Read`, `Glob`, `Grep` for `sourcesDir` and `extraWritableDirs`, plus `Write`, `Edit` for the latter |
| file tools or at least one plugin | `Skill` |
| `spec.buildSubagents()` returns something | `Agent`, `Bash` |

`TodoWrite` is the SDK's task list for long jobs (the session's `env` is `process.env` plus `CLAUDE_CODE_ENABLE_TASKS=0`, without which the CLI replaces it with its own Task tools): the chats show the list instead of the calls (see [Ink chat](../terminal-ui/ink-chat.md#whats-on-screen)). Nothing else of the CLI's built-in tools is available. `Bash` is there only because the SDK won't spawn a subagent whose own tools aren't in the session's; a hook denies it to the main agent.

### MCP servers and permissions

`mcpServers` holds `spec.buildMcpServers(config, runDir)` plus the kit's own, when they apply:

| Server | Tool | When |
| --- | --- | --- |
| `approvals` | `request_human_approval`, `ask_human`, `present_plan` | mode is not `autonomous` |
| `manualLogin` | `request_manual_login` | mode is not `autonomous` and `spec.manualInterventionTexts` is set |
| `sourceFiles` | `list_sources`, `extract_text`, `save_to_sources`, `download_to_sources`, and `request_file`, `retire_source` outside autonomous mode | `config.sourcesDir` is set |
| `time` | `current_time`, `date_math` | always (in `config.timeZone`, or the system's) |
| `knowledge` | the `knowledge_*` tools (`knowledge_retire` outside autonomous mode) | the built-in knowledge base, unless `spec.knowledgeTools` is `"files"` |

`canUseTool` is `allowAnyMcpTool`: every `mcp__*` call is approved, anything else is denied (the built-in tools above are already pre-approved, so they never reach it). `disallowedTools` is `spec.disallowedTools ?? []` and wins over everything.

### Hooks

`PreToolUse`, in this order:

1. the [transcript logger](../security/transcript.md);
2. the [file scope gate](../security/file-scope.md), with file tools;
3. the [step gate](../human-in-the-loop/step-gate.md), outside autonomous mode, active only while the mode is `interactive`;
4. the plan gate, likewise outside autonomous mode, active only while the mode is `plan` (see [modes](./modes.md#plan));
5. with subagents, the three [subagent gates](../security/subagent-gates.md): type, Bash, foreground.

`PostToolUse`: the transcript logger.

The result also has `knowledgeStore`, the knowledge base's store, when the agent reaches it through its tools (see [Knowledge store](../capabilities/knowledge-store.md)).

### Skills, plugins and the working directory

When the session has file tools or at least one plugin:

- `cwd` is `config.projectDir`;
- `additionalDirectories` are the searchable folders (`knowledgeDir`, `sourcesDir`, `extraWritableDirs`);
- `plugins` are `spec.pluginRoots(config)`, plus the knowledge plugin when the knowledge base is on, each loaded as a local plugin with its MCP discovery skipped;
- `skills` is `spec.skills ?? "all"`; a list gets the knowledge base's skills added when it's on.

Otherwise the SDK's defaults apply (the process's working directory, no plugins).

### Settings

| Option | Value | Why |
| --- | --- | --- |
| `settingSources` | `spec.settingSources ?? ["project"]` | the runner's own Claude Code settings never reach the agent unless asked for |
| `settings.autoCompactEnabled` | `options.autoCompactEnabled ?? true` | long chats keep working |
| `settings.autoMemoryEnabled` | `false` | the runner's Claude Code memory is not the agent's |
| `settings.includeGitInstructions` | `false` | no kit agent commits code, and the git context skewed the reply language |
| `includePartialMessages` | `true` | replies stream token by token |
| `maxTurns` | `400` | a generous cap per query |

See [Permissions and isolation](../security/permissions-and-isolation.md) for the reasons.

### Subagents

`agents` is what `spec.buildSubagents(config)` returned, with the reply language line appended to each subagent's prompt.

### Runs

With `options.run`: `sessionStore` is a [run store](../sessions/runs-and-resuming.md) for `run.dir`, and `resume` is `run.sessionId` when it has one.

## Adding your own options

The result is a plain object: spread it to add or override anything the kit doesn't set for you.

```ts
const { options } = await buildSessionOptions(config, runDir, spec);

const session: Options = {
  ...options,
  model: "claude-sonnet-5",
  maxTurns: 50,
  hooks: {
    ...options.hooks,
    PostToolUse: [...(options.hooks?.PostToolUse ?? []), { hooks: [myAuditHook] }],
  },
};
```

Keep the kit's hooks when you add yours: replacing `hooks` wholesale would drop every guardrail. See [Your own hooks](../advanced/hooks.md).

## Calling it more than once

Every call builds a fresh set of servers and hooks bound to its `runDir`. Build the options once per session, and again for another run folder (that's what a session opener does on `/resume`). The resolved language, the mode control and the transcript logger belong to that call.
