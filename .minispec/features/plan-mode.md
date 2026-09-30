# A plan mode

Issue: [#8](https://github.com/falkenslab/agent-kit/issues/8)

## Goal

Add a fourth mode, "plan", next to interactive, guided and autonomous and switchable with Shift+Tab, in which the agent only reads and writes its plan: nothing else is written and nothing is changed until the human leaves the mode.

## Context

- The kit's modes are `interactive | guided | autonomous` (`Mode`, `src/core/agentSpec.ts`). `createModeControl()` (`src/core/session.ts`) lets a guided or interactive session switch between those two while it runs, and the Ink chat does it with Shift+Tab (ADR-016). Autonomous can't switch: it has no approval tool.
- The modes differ in the step gate (interactive asks before every call) and in the tools (autonomous has no approval tool). None of them keeps the agent from acting: an agent asked to think something through first can still write files or click in a browser.
- Consumers want a "think before building" phase: teacher-agent's activity-building process (a plan in `drafts/<slug>/plan.md`, iterated with the teacher and reviewed before anything is built) needs a mode where the only thing the agent can write is that plan.
- The SDK has its own `permissionMode: "plan"` ("no execution of tools"), switchable mid-query with `Query.setPermissionMode()`, and `planModeInstructions` to replace the plan-mode reminder's workflow body; the CLI wraps it with a read-only preamble and the `ExitPlanMode` protocol. Unknown: whether it blocks MCP tools and in-process tools the kit relies on (approvals, manual login, an agent's own servers), how it interacts with the kit's `canUseTool` (`allowAnyMcpTool`) and hooks, and whether it lets a single plan file be written.

## Changes

- Investigate first, and record what's confirmed empirically (ADR): `permissionMode: "plan"` with the kit's hooks and `canUseTool`; whether Write to one allowed file works under it; what happens to MCP tool calls (read-only ones included); `ExitPlanMode` in a kit session; switching in and out with `setPermissionMode()` while a turn is idle.
- `Mode` gains `"plan"`. `ModeControl.switchable` includes it for guided and interactive sessions (Shift+Tab cycles guided → interactive → plan); autonomous stays unswitchable.
- A plan gate (PreToolUse hook), active only while the mode is "plan", whatever the SDK's own plan mode does:
  - allows reading tools (Read, Glob, Grep, WebFetch, WebSearch) and the agent's declared read-only tools;
  - allows Write/Edit only to the plan file(s) the agent declares (`AgentSpec.planFiles(config)` or a pattern such as `drafts/*/plan.md`);
  - denies every other write, Bash, and tools that modify: an agent-provided `isModifying(toolName, input)` callback, so a consumer can list which browser actions change something (teacher-agent already classifies them for its publish gate);
  - its deny reason tells the model it's in plan mode and how the human leaves it.
- The status bar shows the mode as "plan"; the chat's texts in the four languages; `planModeInstructions` (or the kit's own system reminder) tells the model what the mode is for.
- captain-whiskers uses it; the documentation site gets a guide section; README and CHANGELOG.

## Acceptance

- In captain-whiskers' chat, Shift+Tab reaches "plan"; there, a request to change something produces only the plan file, the other writes and a modifying tool are denied with the reason, reads work; leaving the mode lets the agent act on the plan.
- An autonomous session still can't switch.
- Tests for the plan gate (allowed plan file, denied write elsewhere, denied modifying tool, allowed read) and for the mode cycle.
- `verify` passes, documentation site included.
