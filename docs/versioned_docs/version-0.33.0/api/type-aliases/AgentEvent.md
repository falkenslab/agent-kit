# Type Alias: AgentEvent

```ts
type AgentEvent = 
  | {
  text: string;
  type: "text";
}
  | {
  input: unknown;
  toolName: string;
  toolUseId?: string;
  type: "action";
}
  | {
  input: unknown;
  parentToolUseId?: string;
  toolName: string;
  toolUseId?: string;
  type: "subagent-action";
}
  | {
  isError: boolean;
  text: string;
  toolName: string;
  toolUseId: string;
  type: "tool-result";
}
  | {
  failedServers: string[];
  type: "mcp-error";
}
  | {
  errorText: string;
  failed: boolean;
  resultText: string | null;
  status: string;
  type: "turn-end";
  usage?: SessionUsage;
}
  | {
  level: "info" | "notice" | "suggestion" | "warning" | "local-command";
  text: string;
  type: "info";
}
  | {
  suggestion: string;
  type: "prompt-suggestion";
};
```

Defined in: [core/runner.ts:15](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L15)

A transport-agnostic view of one turn's worth of output from `query()` — the same
normalized shape whether the caller is going to print it to a console, forward it to a
chat REPL, or serialize it over Electron IPC (a real consuming agent had four
separate entry points — CLI run, CLI chat, an exploration mode and a desktop chat — that
all parsed the SDK's raw message stream themselves, nearly identically).

Deliberately thin: no formatting (no "[agent]"/"[action]" prefixes, no friendly tool
labels — those are domain/presentation concerns the caller owns), and no filtering
beyond what's always correct regardless of caller (see `action` below).

## Union Members

### Type Literal

```ts
{
  text: string;
  type: "text";
}
```

One streamed text token from the agent's own reply. No separate "block started"
event: a caller that wants a prefix before a new run of text (e.g. "\n[agent] ") can
track "was the previous event also `text`?" itself — simpler than mirroring the SDK's
own content-block boundaries, and equivalent in practice.

***

### Type Literal

```ts
{
  input: unknown;
  toolName: string;
  toolUseId?: string;
  type: "action";
}
```

A tool call the main agent itself made — never from inside a subagent's own private
turn (an `assistant` message with a non-null `parent_tool_use_id`, e.g. a subagent
spawned via the `Agent` tool): those are already reported back to the `Agent` tool
call that started them, so surfacing their *internal* tool use here would make it
look like a subagent had taken over the session, not just handed a result back to the
main agent. This filtering is the one piece of interpretation this module always
applies, since it's correct for every caller, not a presentation choice.

***

### Type Literal

```ts
{
  input: unknown;
  parentToolUseId?: string;
  toolName: string;
  toolUseId?: string;
  type: "subagent-action";
}
```

A tool call made inside a subagent's own turn (see `action` above for why those are
kept apart). Only for showing that a subagent is busy: a console log ignores it.

***

### Type Literal

```ts
{
  isError: boolean;
  text: string;
  toolName: string;
  toolUseId: string;
  type: "tool-result";
}
```

What one of the main agent's tool calls returned, paired with its `action` by
`toolUseId`, as plain text (images and other non-text parts left out). Subagents'
results stay out, as their actions do. A console log ignores it.

***

### Type Literal

```ts
{
  failedServers: string[];
  type: "mcp-error";
}
```

One or more MCP servers failed to connect at session startup.

***

### Type Literal

```ts
{
  errorText: string;
  failed: boolean;
  resultText: string | null;
  status: string;
  type: "turn-end";
  usage?: SessionUsage;
}
```

A turn (one full `query()` response cycle) has finished. `failed` is the real
failure signal — the SDK can report `status: "success"` even when the turn actually
failed on an API error (billing/access denied, etc.), with the real message landing
in `resultText` instead of `errorText` in that specific case (confirmed empirically:
an org-level access error came back as subtype "success", is_error: true, with the
real message in `result`) — check `failed`, not `status === "success"`.

***

### Type Literal

```ts
{
  level: "info" | "notice" | "suggestion" | "warning" | "local-command";
  text: string;
  type: "info";
}
```

Out-of-band text from the CLI loop itself, not from the model: local-command output
(e.g. built-in `/usage`) or an informational banner (hook feedback, an unrecognized
`/slash-command` notice, ...). Without this, those `system` messages fell through
`generateEvents()` unhandled — confirmed empirically: typing an unrecognized/
unnamespaced plugin slash command produced total silence (no text, no error, nothing),
because the SDK's own response to it arrives as exactly this message shape and this
module simply dropped it.

***

### Type Literal

```ts
{
  suggestion: string;
  type: "prompt-suggestion";
}
```

The predicted next prompt, when `Options.promptSuggestions` is on. It arrives after
that turn's `turn-end`, so a reader that stops at `turn-end` sees it first thing in the
next turn; a console log ignores it.
