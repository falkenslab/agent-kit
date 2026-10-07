# ADR-026: One graphical interface, in the browser and on the desktop

## Decision

An agent on the kit can run with a graphical interface besides its terminal chats, for people without technical knowledge: in a browser (served by the agent itself, reachable from a phone through a tunnel), and as a desktop application with an installer. Both are the same interface, built in three layers:

1. **A chat controller without an interface**: what `runChatInk()` and `runChatTui()` do today besides drawing (opening and reopening the session, the input queue, `/resume`, `/extensions`, the mode, the panels of the interaction port, the session log), taking actions and giving a state that can be serialized. The terminal chats become views of it.
2. **The web host**, `runChatWeb()`: the controller served over HTTP, with a page that draws its state.
   - It listens on `127.0.0.1` only, and needs a token the agent prints in its URL when it starts: a tunnel (cloudflared, ngrok, Tailscale) is the person's, and reaches that port.
   - One person at a time per session. The modes and their gates stay as they are: in guided or interactive mode, what needs approval asks for it on the phone.
   - No new dependencies: `node:http`, server-sent events for the state, `POST` for the person's actions; one page served by the kit.
3. **The desktop application**: Electron, loading that same page in a window of its own, with what only the desktop gives (native folder and file pickers, notifications, signing in without a terminal). Installers and updates with `electron-builder`. The kit provides the template; each agent its name, icon and theme, so the person installs "Miyagi", not agent-kit.

## Motivation

- padawan and miyagi are for students and teachers, not developers: a terminal, slash commands and environment variables keep most of them out.
- One graphical interface for both, rather than a web one and a desktop one: the desktop application is the web page in a window, so everything built for one serves the other, and the phone gets it through the browser.
- The core already knows no terminal (ADR-001, ADR-013): the agent's events (`runQuery()`), the interaction port and the mode control are what a new host needs. What isn't shared yet is the chat's own logic, now written twice (Ink and readline), and a third and fourth copy would be worse: hence the controller first.
- Electron, because the agent and the SDK run on Node and Electron brings its own: the agent runs inside the application, with nothing else to install. Rejected: **Tauri** (no Node: a separate Node binary would have to be bundled and started), **a web page only** (no installer, no native pickers, the person still starts the agent from a terminal).
- Security, because a tunnel puts an agent that acts (it browses, writes files, posts in a course) on the internet: hence localhost only, a token, one person, and the gates unchanged.

## Consequences

- Phases, each with its own note: the controller (`chat-controller.md`), the web host (`web-chat.md`), the desktop application (`desktop-app.md`). Before building the third, a probe: a packaged Electron window that starts Captain Whiskers through the SDK, which spawns the Claude Code CLI (paths, permissions, antivirus inside an installed application). If it fails, this ADR changes.
- Usability for people without technical knowledge is most of the work, not the technology: buttons and menus instead of slash commands, signing in from the window (`ensureClaudeAuth()` today offers the CLI), a guided first start (language, working folder, what the agent does), tool calls summarized by default, errors in plain words.
- Costs to plan for: code signing (an Apple Developer account and notarization for macOS; a code-signing certificate for Windows, or SmartScreen warns), and an application of 100–150 MB.
- The terminal chats stay, for developers and for agents that want no more.
