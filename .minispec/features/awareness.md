# Awareness: the agent knows itself, as it is now

Issue: [#43](https://github.com/falkenslab/agent-kit/issues/43)

## Goal

An agent knows, at any moment of a session, who it is and what it can do (its mode, its extensions and their tools, its subagents, skills and commands, its memory, its context), and the person can ask it about any of that, through a built-in extension, `awareness` ("conciencia" for the person), that replaces agent-help.

## Context

- agent-help (`src/core/agentHelp.ts`, `assets/agent-help/`) is part of the core (ADR-025 kept it out of extensions): `identity` adds a "Who you are" prompt section, and a skill written into the run folder when the session opens says the mode, the extensions on and off, their help lines, the kit's chat (keys, commands) and the agent's own guide (`helpGuide`).
- It's a snapshot: after Shift+Tab, or the agent leaving plan mode, the skill still says the first mode; it knows nothing of the context in use, each extension's tools, the subagents.
- Extensions see only what they're given (`ExtensionContext`: config, spec, run folder, mode, interactive), not the session they're part of.

## Changes

- A read-only view of the session for extensions, from the core (`ExtensionContext.session()`, read on every call): the mode now and the switchable ones, the extensions active (with their tools) and off (with why), the subagents, the skills and commands, the context used, the run, the agent's and the kit's versions. The core's facts, never another extension's data (#30).
- `src/extensions/awareness/` and `extensions/awareness/` (the plugin): the "Who you are" section; a read-only tool, `about_me`, that answers from that view; the skill for how the agent is used (the kit's chat, the agent's `helpGuide`), without the facts that change, which the tool gives. Provides `self-awareness`.
- Enabled like any other (`extensions: [..., "awareness"]`, with `identity`); agent-help and its core parts go (no backward compatibility, 0.x). ADR-025 updated: agent-help leaves the "never extensions" list.
- Captain Whiskers enables it; docs (extensions, identity and helpGuide, the captain).

## Acceptance

- After Shift+Tab, "what mode are you in?" answers the new one; "what can you do?" names the active extensions' tools and the subagents; "why can't you remember me?" names the memory extension as off and why, when it is.
- An agent without `awareness` has no "Who you are" section, tool or skill.
- `verify` passes.
