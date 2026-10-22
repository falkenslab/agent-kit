# A tool that always asks offers "yes, this session", and then stops asking

Issue: [#78](https://github.com/falkenslab/agent-kit/issues/78)

## Problem

- The guided gate (#74, #76) never offers "yes, always" for a tool that always asks (the agent's or the manifest's `confirmTools`, else the server's `destructiveHint`), and asks for it even inside an approved batch. But it offers "yes, this session", and once chosen the tool runs without asking for the rest of the session.
- Seen in miyagi against moodle-sandbox: before `mcp__moodle__delete_activity` the panel offered Sí / Sí, en esta sesión / No / No, nunca. One "this session" would let every later deletion in that chat through unasked; miyagi's rule is that deleting always asks.

## Cause

In `src/core/hooks/guidedGate.ts`, `thisSession.has(full)` is checked before `alwaysAsks`, and the choices leave out only `always` for such a tool.

## Solution

- For a tool that always asks, offer only what covers this call: yes, no, and "no, never" (which only makes it stricter). No "this session", no "always".
- A tool approved for the session that later counts as always asking (a `destructiveHint` that appears after a server restarts) asks again: `alwaysAsks` is checked before `thisSession`.
- Docs (English and Spanish): Approvals (the answers), Writing an extension (`confirmTools`).

## Verification

- The guided gate's tests: a `confirmTools` tool and a `destructiveHint` one are offered yes, no and no never, and ask on every call.
- `verify` passes.
