# The agent as a desktop application

Issue: [#41](https://github.com/falkenslab/agent-kit/issues/41)

## Goal

An agent on the kit can be installed and used as a desktop application by people without technical knowledge: an installer with its own name and icon, a window with the web chat, and nothing to do in a terminal (ADR-026, phase 3).

## Context

- Needs the web chat (`web-chat.md`): the window loads that page.
- Electron brings Node, which the agent and the SDK need. The SDK spawns the Claude Code CLI as a separate process: whether that works inside a packaged, installed application (paths inside the archive, permissions, antivirus) is unknown, hence a probe first.

## Changes

- **Probe first**: a packaged Electron app (Windows, then macOS) that starts Captain Whiskers through the SDK and completes a turn with tools. If it fails, ADR-026 changes before anything else.
- The kit's application shell: an Electron main process that starts the agent's web host on a free local port with a token and loads it in its window (the token never leaves the process); native folder and file pickers and notifications through a preload bridge; the agent's name, icon and theme.
- Signing in without a terminal: pasting an API key or signing in with the account, kept in the operating system's credential store.
- A guided first start: language, the working folder, what the agent does.
- Usability for non-technical people: buttons and menus for everything a slash command does, tool calls summarized by default, errors in plain words, the agent's own help one click away.
- A template and a build script for agents (`electron-builder`: Windows installer, macOS DMG, Linux AppImage), with code signing and updates; Captain Whiskers as the first.
- Docs: a guide for agent authors (building and signing the installer), Captain Whiskers.

## Acceptance

- Captain Whiskers installs from its installer on Windows and macOS, opens with its own name and icon, signs in from the window, and completes a conversation with tools, an approval and a file picked from disk, without a terminal.
- `verify` passes.
