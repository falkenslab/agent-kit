# Guided mode asks before an extension's tools that change things

Issue: [#74](https://github.com/falkenslab/agent-kit/issues/74) (and #76, folded in)

## Goal

In guided mode, an installed extension's tool that isn't known to only read waits for the person's yes, enforced by the kit and not left to the model, with answers the person can make last (this session, always, never) so a batch of work isn't asked again and again.

## Context

- ADR-025 promises every extension tool is treated as publishing unless confirmed read-only. That holds in `interactive` (the step gate asks before everything, reads included) and `plan` (the plan gate denies what isn't read-only), not in `guided`, the mode most agents start in: `canUseTool` is `allowAnyMcpTool` and no hook looks at extension tools. `request_human_approval` exists, but calling it is the model's choice.
- Found twice: miyagi rebuilt the guarantee itself (`src/publishGate.ts`, falkenslab/miyagi#43), classifying `mcp__moodle__*` tools by verb; and in agent-extensions#23 the agent took a question about Canva's format as the yes to create a design in the person's account.
- What's read-only is already known: the manifest's `readOnlyTools`, else the server's `readOnlyHint` (`readOnlyHints.ts`), the same the plan gate uses. Servers also give `destructiveHint`.
- `remoteServers: "ask"` (#70) asks before every call to a remote server, reads included; this gate is about what changes things, in any server.

## Changes

- **A guided gate** (`hooks/guidedGate.ts`), a `PreToolUse` hook beside the plan gate, active while the mode is `guided` (the step gate covers `interactive`, so one question, not two): an installed extension's tool that isn't read-only asks the person through the interaction port with a **Proposed action** checkpoint (the extension, the tool's label in the session's language, its parameters). The main agent's calls and its subagents'.
- **A batch already approved**: right after `request_human_approval` was approved, calls go on without asking until the person's next message or the next approval request, so one approval covers a batch (#74's proposal).
- **`metadata["agent-kit"].confirmTools`**: tools that always ask, even inside an approved batch (#76), e.g. Canva's create, edit, publish. A server's `destructiveHint` counts the same when the manifest lists none. In the schema, the reference and the catalog generator.
- **The answers** (#76): **yes** (this call), **yes, this session** (that tool doesn't ask again until the session ends), **yes, always** (not offered for a `destructiveHint` or `confirmTools` tool, since it would approve what hasn't been seen), **no** (denied, the model told not to retry without asking), **no, never** (the tool disallowed in later sessions; in this one, denied).
- **Kept with the extension's scope**, next to its options: "always" and "never" per tool; undone by the person, never by the model: `/extensions config <name>` and `extension config <name>` list them and set them back to asking, and can turn the gate off for an extension it trusts (`confirm=off`).
- **The agent's word**: `AgentSpec` gives its own list per extension (merged with the manifest's) and can turn the gate off; in **autonomous**, where no one can be asked, a spec option says whether these tools are denied or run (`deny` by default).
- The answers go to the transcript (what was approved, always or never, and when).
- Tests: a non-read-only extension tool asks in guided and not in interactive (the step gate does); read-only ones never ask; an approved batch lets calls through until the next message; `confirmTools` asks inside a batch; each answer, kept across a session where it says so; a destructive tool isn't offered "always"; autonomous denies by default; `/extensions config` lists and resets.
- Docs (English and Spanish): human in the loop (approvals, the guided gate), modes, Extensions (writing: `confirmTools`; configuring; reference), security overview; ADR-025 corrected to say how guided mode keeps its promise.

## Acceptance

- In a guided chat, an extension's tool that changes things waits for the person's yes in a panel, whatever the model did before; a no denies it and the model is told.
- Read-only tools never ask; plan mode stops the others as now; autonomous denies them by default.
- After approving a batch with `request_human_approval`, its calls go on until the person's next message; a `confirmTools` tool still asks.
- "Yes, this session", "Yes, always" and "No, never" hold as described, and `/extensions config <name>` resets them; turning the gate off for an extension makes its tools run without asking.
- miyagi can drop its own `publishGate.ts` (or keep only stricter rules on top).
- `verify` passes.
