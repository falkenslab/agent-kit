# Type Alias: Mode

```ts
type Mode = "interactive" | "guided" | "autonomous" | "plan";
```

Defined in: [core/agentSpec.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L19)

The human-supervision spectrum every agent built on this kit shares, independent of
domain: "interactive" pauses before every single action, "guided" only pauses before a
hard-to-undo/visible-to-others action, "autonomous" has no human-in-the-loop channel at
all, and "plan" only reads and plans: nothing is changed until the human leaves it (see
hooks/planGate.ts). See session.ts's buildSessionOptions() for exactly what each mode changes.

Deliberately orthogonal to whether the session is a one-shot run or a multi-turn chat
(that's a matter of which entry point the caller uses — a single `query()` call vs.
`runChatTui()`/`createInputQueue()` — not a supervision level): a concrete agent that
wants to know "is this session chat-shaped" for its own purposes (e.g. picking a
different system-prompt template) should track that as its own domain field on its
config type, not conflate it with `Mode`.
