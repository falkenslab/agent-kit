# External requirements of an extension

Issue: [#63](https://github.com/falkenslab/agent-kit/issues/63)

## Goal

An extension declares the programs it needs on the computer (Docker, ffmpeg…), and the kit checks them, tells the person what's missing, what it's for and how to install it, and never installs them.

## Context

- The kit installs an extension's files only: no `npm install`, no install scripts, Node servers alone (`src/core/externalExtensions.ts`, ADR-025). That stays.
- A bundled Node server may still run programs the person installs: Docker for `docker-lab`, ffmpeg, `yt-dlp` or `faster-whisper` for `video`, both planned in agent-kit-extensions. Today nothing says so before a tool fails.
- Most extensions need nothing (moodle-mcp downloads its own browser).
- Capabilities (#62) say what the agent can do; a requirement says which of them work on this computer.
- Claude Code ignores `metadata`: the extension's own server must also explain what's missing there.

## Changes

- `metadata["agent-kit"].requirements`, optional: each program with a `name`, how to check it (a command and a minimum version), how to install it per system (`winget`, `brew`, `apt`, or a link), whether it's optional, and the capabilities (#62) or tools that need it. In the schema and the manifest's types.
- The check: run each command with a short timeout, with no shell and only the manifest's arguments, and compare the version; the result kept for the session (a computer doesn't change mid-conversation), again on `/extensions` and on `reload`.
- At install (`extension add`, `/extensions install`, the controller): what's missing, what it's for and how to install it on this system. A missing required one doesn't block the install, it keeps the extension off with that reason; a missing optional one leaves the rest on.
- Capabilities for real: what a missing requirement needs is left out of what the extension provides, so `requires` gating, the prompt's Extensions section, `/extensions` and `about_me` see only what works here, with the reason ("transcribing needs ffmpeg: winget install ffmpeg").
- The catalog: "Needs Docker" in the controller's entries, the captain's drawer and `catalog.json` (the generator and its schema).
- A convention for the extension's server, written in the docs and followed by the example: a read-only `check_requirements` tool, and a tool whose program is missing fails with what's missing, what it's for and how to install it.
- Tests: the check with fake commands (present, absent, too old, hanging); a required one missing keeps it off with the reason; an optional one leaves the rest; the install text per system.
- Docs: Extensions → writing, installing, reference; `schemas/` and the generator's README.

## Acceptance

- An extension needing Docker, on a computer without it, installs, stays off, and `/extensions` says "needs Docker" with the command to install it on this system.
- With ffmpeg missing and marked optional for transcribing, the rest of `video`'s capabilities work and the agent says what transcribing needs.
- The check never runs anything but the manifest's command, never through a shell, and never installs anything.
- An extension without requirements behaves exactly as today.
- `verify` passes.
