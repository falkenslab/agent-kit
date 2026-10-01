# ADR-016: Switching between guided and interactive during a session

## Decision

`buildSessionOptions()` returns a `ModeControl` with the session's current mode. A session that starts `guided` or `interactive` can switch between the two while it runs (the Ink chat does it with Shift+Tab); an `autonomous` session can't switch, and a non-autonomous one can't become autonomous.

## Motivation

Claude Code lets the user change how much it asks mid-conversation, and the same need shows up here: explore freely, then review each step before something delicate. The two modes differ only in the step gate; `autonomous` differs in its tools.

## Consequences

- The step gate hook is registered whenever the approval tool is (outside `autonomous`) and asks only while the current mode is `interactive`; otherwise it gives no decision, so the call goes on as if the hook weren't there. A session that never switches behaves exactly as before.
- `autonomous` has no approval tool by design (no channel to ask a human at all, see `session.ts`), and a tool can't appear or vanish mid-session, hence no switching into or out of it.
- The system prompt keeps the mode it was built with; a consumer whose prompt depends on the mode should word it so both switchable modes fit.
- `createStepGate()` takes an optional `isActive` callback; without it, it always asks, as before.
- Plan mode joins the switchable modes the same way (ADR-023).
