# Date and time tools

Issue: [#15](https://github.com/falkenslab/agent-kit/issues/15)

## Goal

Every agent knows the date and time and gets date arithmetic right, through two tools of the kit: `current_time` and `date_math`.

## Context

- The kit doesn't put the date in the prompt, and only subagents have Bash: an agent can't know what day it is. Models also get date arithmetic wrong ("days until 15 November", "the date three weeks from now"), which course agents need for deadlines and calendars.
- captain-whiskers solved it with its own in-process MCP server (`clock`, `current_time`) for its `grumete-del-reloj` subagent; every agent would have to repeat it.
- The knowledge base's log (#13) needs the real date too.

## Changes

- An in-process MCP server registered in every session, in every mode:
  - `current_time()`: date, time, weekday and time zone (the system's; a config or spec option can set another, e.g. a course's);
  - `date_math(...)`: the difference between two dates (days, or working days), and a date plus or minus days, weeks or months.
- Read-only: the plan gate allows both. A spec can leave them out with `disallowedTools`.
- Labels and phrases in the four languages.
- captain-whiskers drops its `clock` server: `grumete-del-reloj` uses the kit's tools, and `planMode.isReadOnlyTool` no longer needs to name them.
- Docs: a page or section for the kit's built-in tools (session options, tools and MCP), the captain's README and guide.

## Acceptance

- A session in any mode has `current_time` and `date_math`; `disallowedTools` removes them.
- `current_time` gives the system's time zone, or the configured one.
- `date_math` gets differences, working days and additions right across month ends, leap years and daylight saving changes (tests).
- The plan gate allows both.
- captain-whiskers answers the time through its cabin boy with the kit's tools, and has no `clock` server.
- `verify` passes, captain-whiskers included.
