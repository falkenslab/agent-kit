# ADR-018: A session loads only the project's configuration

## Decision

`buildSessionOptions()` sets `settingSources: ["project"]`, `autoMemoryEnabled: false` and `includeGitInstructions: false` by default, and passes `AgentSpec.skills` through (default `"all"`). An agent can widen `settingSources` (`"user"`, `"local"`) or narrow it (`[]`), and list the skills it offers; the knowledge base's skills are added to a list when the knowledge base is on.

## Motivation

- Without `settingSources` the SDK loads every source, as the CLI does, so an agent inherited the Claude Code configuration of whoever ran it: its `language` setting became a system prompt rule that outranked the agent's own (a French workspace in student-agent answered in Spanish), and its CLAUDE.md, skills and hooks came along.
- The runner's auto-memory (`~/.claude/projects/<repository>/memory/MEMORY.md`) is loaded whatever `settingSources` says (confirmed empirically): notes for the runner, not for the agent, whose memory is the knowledge base.
- Context per call, measured on a captain-whiskers session answering "hola" (API usage, not `getContextUsage()`, whose split between skills and system tools was misleading): ~16.1k tokens with every source, ~15.7k with `["project"]`, ~11.4k with `settingSources: []`, its own two skills and no auto-memory. Plugin commands keep working when they aren't in the `skills` list.
- Git instructions are for committing code, which no kit agent does, and without them the CLI's git context (the runner's git user name among it) stopped pulling a German session's replies into Spanish (confirmed empirically).
- `"project"` stays by default: an agent's workspace skills, commands and CLAUDE.md under `projectDir/.claude/` are usually wanted (student-agent's are).

## Consequences

- A behavior change for existing agents: the runner's personal settings, CLAUDE.md and skills no longer reach them. An agent that relied on them asks for `"user"`.
- `skills` is a context filter, not a sandbox: unlisted skills stay on disk.
- Not controlled by any option: the CLI adds the logged-in Claude Code account's name and e-mail (`oauthAccount` in `~/.claude.json`) to the context, and the model may take the runner's language from them (confirmed empirically). Only a separate `CLAUDE_CONFIG_DIR` avoids it, which would also move the account's login.
