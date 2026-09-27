# ADR-004: Human input races a terminal and a response file

## Decision

`askForDecision()` (used by the step gate and the approval tool) races two channels: the keyboard when stdin is a TTY, and `<runDir>/approval-response.txt`. Without a TTY it prints nothing and creates no `readline.Interface`. A chat REPL shares its own readline through `sharedReadline.ts`.

## Motivation

A session may be piloted by another process (Claude Code, a test script) or by a non-terminal host with its own UI. Creating and closing a second readline while a chat's is open corrupts stdin's raw mode and leaves the terminal stuck.

## Consequences

The file channel is a public contract: consumers' test tooling (e.g. teacher-agent's `auto-approve.mjs`) and desktop apps depend on it. Any new terminal UI must keep it and must not open its own stdin reader alongside the shared one.
