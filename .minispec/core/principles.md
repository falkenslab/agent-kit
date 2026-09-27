# Engineering principles

Consult **before** writing code.

- Solve first, optimize later; readable code over clever code.
- Avoid premature abstractions; propose a simpler alternative before adding complexity.
- Preserve existing behavior; don't refactor outside the task's scope.
- Document decisions, not implementation.
- Nothing domain-specific in the kit: consumers bring their domain through `AgentSpec` and their config type.
- `src/core/` never assumes a terminal (ADR-001).
- Trust "confirmed empirically" comments; re-verify against the SDK before changing that behavior.
- Touching subagent wiring means re-reading all three gates (ADR-003).
- Guardrails live in hooks, not in prompts (ADR-003, ADR-007).
- Features that grant Bash stay opt-in in consumers.
- Public API changes are checked against the consumers (ADR-011).
