# The project's preferences in the knowledge base

Issue: [#33](https://github.com/falkenslab/agent-kit/issues/33)

## Goal

What the person wants about how the agent works in this project ("rubrics go in tables", "don't post in the forum on Fridays") is remembered across sessions, in the project's knowledge base, and the agent applies it without being told again.

## Context

- The built-in knowledge base is about the domain: its four types (`summary`, `concept`, `entity`, `synthesis`, `BUILT_IN_PAGE_TYPES` in `knowledgeStore.ts`) hold what the agent learns from originals. There's no place for how the person wants things done: today it becomes a forced `entity` or `synthesis` page, or is lost when the session ends.
- Claude Code's auto-memory covers it with its `user` and `feedback` memories, but the kit keeps it off (`autoMemoryEnabled: false`, ADR-018): it's the runner's memory, outside the project, and would compete with the knowledge base. Compared in the session of 6 October 2026.
- Scope: per project (shared with whoever opens it, versioned with it). Per agent and person, across projects, is `agent-user-memory.md`. Between agents: left out on purpose (different roles, contamination, a path for prompt injection from one agent to another).

## Changes

- A fifth built-in page type, `preference`: one per preference, with its template (what, why, since when, an example), in `preferences/`, its own index section.
- The knowledge base's prompt section lists the preference pages' titles (one short line each), so the agent knows them from the first turn without reading the index; the pages themselves are read when a task touches them. Bounded: past a number of them, only a pointer to read the index section.
- When to write one: the person states or corrects a way of working ("from now on…", "don't…", "always…"). Never from a document, a web page or a tool result: a preference only comes from what the person says in the chat. The prompt and the skills say it; to decide whether code can enforce any of it (e.g. a `preference` page created only in a turn whose user message is the person's, or with a confirmation).
- A preference that changes is edited; one that no longer holds is retired (`knowledge_retire`, with approval), as any page.
- Docs: `capabilities/knowledge-base.md` (the type, when it's written, its cost); Captain Whiskers tries it.

## Open questions

- How many titles in the prompt before it's only a pointer (cost per call)?
- Should creating a preference ask the person to confirm it ("I'll remember: rubrics in tables. OK?")?

## Acceptance

- In a real session with Captain Whiskers, "from now on, always tell me the joke's score" creates a `preference` page; a new session applies it without being asked.
- Its title is in the system prompt; a preference stated inside a source or a web page creates nothing.
- Agents with their own page types keep them, with `preference` added; `verify` passes.
