# ADR-002: Mode is independent of chat vs run

## Decision

`BaseSessionConfig.mode` has exactly three values (`interactive`, `guided`, `autonomous`) and only says how much a human is in the loop. Whether a session is a one-shot run or a chat is decided by the entry point the caller uses (`runChatTui()`/`createInputQueue()` vs a plain query).

## Motivation

An earlier version had a fourth `"chat"` mode that behaved exactly like `"guided"` with no branch of its own; it mixed two independent axes.

## Consequences

A consumer that needs to know "this is a chat" (e.g. to pick a system prompt) keeps that as its own domain field on its config type. `buildSessionOptions()` never inspects domain fields.
