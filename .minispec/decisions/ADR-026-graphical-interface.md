# ADR-026: Graphical interfaces are the agents', on the kit's chat controller

## Decision

An agent on the kit can run with a graphical interface besides its terminal chats (in a browser, served by the agent itself and reachable from a phone through a tunnel; or as a desktop application with an installer), for people without technical knowledge. The kit provides what every such host needs, and each agent builds the interface it wants (changed 7 October 2026: the kit was to ship the web host and the desktop shell too).

- **The kit: a chat controller without an interface** (#39): what `runChatInk()` and `runChatTui()` do besides drawing (opening and reopening the session, the input queue, `/resume`, `/extensions`, the mode, the panels of the interaction port, the session log), taking actions and giving a state that can be serialized. The terminal chats are views of it, and so is any host of an agent's own.
- **The kit: running packaged.** When it runs inside an archive (Electron's `app.asar`), every path it hands to another process points outside it (`app.asar.unpacked`), and it gives the SDK the CLI binary from there. Without that, no packaged agent works, and what fails gives no clue (see Consequences).
- **The agent: the interface.** A web page and its server, a desktop application, its installer and its signing are each agent's, written against the controller: what they show and for whom differ (padawan's students, miyagi's teachers), and an agent that only needs a terminal pays for none of it. Electron is never a dependency of the kit.
- **What any host of an agent's that is reachable from outside must keep** (documented, not enforced): listening on `127.0.0.1` only, a token in the URL the agent prints, one person at a time per session, and the modes and their gates unchanged: in guided or interactive mode, what needs approval asks for it on the phone.
- Captain Whiskers runs in a terminal, in a browser and as a desktop application, as the kit's end-to-end check that it supports them.

## Motivation

- padawan and miyagi are for students and teachers, not developers: a terminal, slash commands and environment variables keep most of them out.
- The core already knows no terminal (ADR-001, ADR-013); what wasn't shared was the chat's own logic, written twice (Ink and readline). With it in a controller, a host is a few dozen lines: that's the kit's part.
- The interface itself is policy, not mechanism (as the file scope, #28): its look, its words, its features, its audience. Kept in the kit, it would be one interface for agents that want different ones, and a heavy dependency (Electron, ~250 MB) for those that want none. If two agents end up with near-identical hosts, the shared part can become an optional package of its own.
- Electron is still the recommendation for a desktop host: the agent and the SDK run on Node, and Electron brings its own, so the agent runs inside the application with nothing else to install. Rejected for that: **Tauri** (no Node: a separate Node binary would have to be bundled and started).
- Security, because a tunnel puts an agent that acts (it browses, writes files, posts in a course) on the internet: hence localhost, a token, one person, and the gates unchanged.

## Consequences

- **Probed (7 October 2026, Windows, Electron 44, SDK 0.3.293; `examples/electron-probe/`, to run again)**: a packaged Electron app (`electron-builder`, `asar`) runs an agent-kit agent through the chat controller: a turn with the kit's tools, an extension's included, and its plugins' skills. It needs two things, both confirmed:
  - The SDK doesn't run the CLI with Node: it spawns a **native binary per platform** (`@anthropic-ai/claude-agent-sdk-<platform>-<arch>`, `claude.exe` on Windows, 209 MB). Packaged, the SDK resolves it inside `app.asar`, which a process can't execute, and the turn hangs with no error. Fixed with `asarUnpack` for that package and `pathToClaudeCodeExecutable` pointing into `app.asar.unpacked`.
  - Every path the kit hands to the CLI or to another process must be outside `app.asar` too: its extensions' plugins (packaged, the knowledge skills silently disappeared), the extension launcher, the agent's own plugins. Fixed with `asarUnpack` and the path rewritten to `app.asar.unpacked`.
  - `ELECTRON_RUN_AS_NODE` in the environment (VS Code sets it) turns Electron into plain Node: a desktop host clears it for the processes it starts, and a developer running one from VS Code's terminal unsets it.
- **Size** of a desktop host: the unpacked Windows app is ~630 MB (Electron ~250, the CLI binary 209); plan for a ~200–300 MB download.
- **Costs** an agent's desktop host plans for: code signing (an Apple Developer account and notarization for macOS; a code-signing certificate for Windows, or SmartScreen warns). `electron-builder` signs every executable it packs, the CLI binary included: whether re-signing Anthropic's binary is acceptable is to check. macOS is still to probe.
- Usability for people without technical knowledge is most of an agent's work, not the technology: buttons and menus instead of slash commands, signing in from the window (`ensureClaudeAuth()` offers the CLI), a guided first start, tool calls summarized by default, errors in plain words.
- The kit's guide for hosts (custom hosts) covers the controller, a web server and an Electron main process, and what was learned packaging.
- The terminal chats stay, for developers and for agents that want no more.
