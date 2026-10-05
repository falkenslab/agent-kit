# A memory of the person, per agent

Issue: [#34](https://github.com/falkenslab/agent-kit/issues/34)

## Goal

An agent remembers what it learns about the person it works for (how they like answers, how they study or teach, their corrections) across all their projects, in a memory of its own that no other agent reads.

## Context

- The project's knowledge base (and its `preference` pages, `project-preferences.md`) travels with one project. Some things belong to the person instead: padawan learning how a student studies, across courses; miyagi learning a teacher's style, across their courses.
- Claude Code's auto-memory does this per project folder (an index, `MEMORY.md`, always in context; one file per fact; types `user`, `feedback`, `project`, `reference`), but the kit keeps it off (ADR-018): it's the runner's, keyed by folder, not the agent's.
- Not shared between agents, on purpose: different roles (miyagi works for the teacher, padawan for the student, maybe different people on one computer), preferences that make sense for one agent spoil another, and a shared memory is a path for an instruction planted in one agent to reach the others. What all agents share (the language) is already configuration.
- With extensions (#29) it's a built-in extension, `memory`, that an agent enables.

## Changes

- Opt-in, the agent's choice: a folder of its own outside any project (e.g. `AgentSpec.userMemoryDir`, `~/.miyagi/memory/`), never shared with another agent.
- Kept like Claude Code's auto-memory, which works: one entry per fact (a name, a one-line description, a type: `user` for who the person is, `feedback` for how they want things done, with the why), and an index with one line per entry, always in the system prompt (bounded: past a size, the oldest lines are left out and the index says so).
- Reached only through tools (as the knowledge base, ADR-024): `memory_save` (new or update), `memory_forget`, and the index in the prompt; the folder is tool-only for the file tools (`toolOnlyDirs`), and no other file tool reaches it.
- Written only from what the person says in the chat, never from a document, page or tool result; the prompt says when to save (a correction, a stated preference, something about the person that will matter again) and when not (what the project's knowledge base holds, what's only for this task).
- The person can see and correct it: `agent-help` tells them it exists; a command lists it and forgets an entry.
- Docs: a guide page; padawan or Captain Whiskers tries it.

## Open questions

- One memory per agent and OS user, or per agent and the account the agent uses (a teacher with two Moodle accounts)?
- Should saving ask for confirmation, or only say it ("I'll remember that")?
- Index size limit, and what to drop first.

## Acceptance

- An agent with it on saves "I prefer short answers" said in one project's session, and applies it in another project's session.
- Another agent on the same computer doesn't see it; the file tools can't read or write its folder.
- A preference written inside a source or a web page saves nothing.
- Agents without it change nothing; `verify` passes.
