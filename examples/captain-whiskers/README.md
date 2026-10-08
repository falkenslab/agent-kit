# Captain Whiskers

A small agent built on agent-kit: a retired pirate cat who tells jokes, keeps a logbook of what he learns and a treasure chest of originals. He runs in a terminal, in a browser (a phone too) and as a desktop app, each a view of the kit's chat controller. It uses most of the kit, so it doubles as its end-to-end check. He speaks the kit's language, the system's or the one given with `npm start -- --language=fr` (`en`, `es`, `fr`, `de`): his name (Capitán Bigotes, Captain Whiskers, Capitaine Moustaches, Käpt'n Schnurrbart), his on-screen texts and the kit's follow it, and he answers in it. Everything the model reads (prompts, skills, commands) is in English, since text in another language pulls the replies towards it; only his crew keeps Spanish names. It's a standalone project that uses the kit through `file:../..`.

## Getting started

With the kit built (at the repo root, once and after each change to the kit):

```
npm install && npm run build
```

And from this folder:

```
npm install
npm start
```

It needs Claude authentication: `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`) in the environment, or the token saved in his `config.json` (see [His home](#his-home)); the environment wins. If there's none, the terminal offers to create one with `claude setup-token`, and the browser and the app ask for it on the page; either way it's saved in `config.json` for next time.

## Usage

Type as usual, and `/exit` to leave. His commands:

| Command | What it does |
| --- | --- |
| `/captain-whiskers:joke` | A classic pirate joke right away |
| `/captain-whiskers:fresh-joke` | A new joke found on the web by the crew, scored by the parrot and noted in the logbook |
| `/captain-whiskers:stock-the-chest` | Downloads two pages of pirate lore into the chest and asks you for a joke book |
| `/captain-whiskers:learn` | Reads every new original in the chest and writes what it teaches into the logbook |
| `/captain-whiskers:logbook-check` | Checks the logbook (broken links, orphans, originals not learned yet) |

The kit's own `/knowledge:ingest`, `/knowledge:query` and `/knowledge:lint` work too.

He knows who he is, what he is right now and how he's used, through the kit's `awareness` extension: the spec's `identity` gives the model his name, his version and agent-kit's; `about_me` tells him his mode after Shift+Tab, his extensions and their tools, what's off and why, his crew, his commands and how full his context is, and his own [guide.md](guide.md) (his commands, folders and settings); and its `help` skill answers questions such as "how do I resume a conversation?" from the kit's chat.

↑/↓ bring back earlier messages, Tab completes `/commands` and Esc interrupts the reply in progress. Each run keeps its session log, its transcript and the conversation in `~/.captain-whiskers/.run/<date-time>/`: `npm start -- --continue` picks up the latest one, and `/resume` lists them to pick one. The ↑/↓ history lives in `~/.captain-whiskers/.run/history.jsonl`.

In a terminal it uses the kit's Ink interface (`runChatInk`) full screen: the prompt stays at the bottom, PageUp/PageDown and the mouse wheel scroll through the conversation and Ctrl+End (or typing) goes back to the bottom; drag with the mouse to select and right-click to copy to the clipboard. With `CAPTAIN_INLINE=1` it uses the inline mode (with the terminal's own scrollback), and without a TTY, or with `CAPTAIN_PLAIN=1`, the plain readline chat.

It runs in `guided` mode by default, so it can ask you things: which kind of joke, a file, whether to retire an original. With `CAPTAIN_MODE=interactive` it asks for approval before every tool (the panel takes `1`-`3` or `y`/`n`/`q`, and it can also be answered by writing to `~/.captain-whiskers/.run/<date-time>/approval-response.txt`), and with `CAPTAIN_MODE=autonomous` it asks nothing. With `CAPTAIN_MODE=plan` it only reads and plans: its crew can still search the web, read the ship's clock and the logbook, and anything else is denied until the plan is approved (`present_plan`) or you leave plan mode. Started in any mode but `autonomous`, Shift+Tab cycles through `guided`, `interactive` and `plan`. `/plan` goes into plan mode and back.

It shows every tool call with its result (`toolDetail: "full"`, the kit's default); `CAPTAIN_TOOL_DETAIL=calls` shows the calls without their results, and `CAPTAIN_TOOL_DETAIL=summary` one line per group. Ctrl+O unfolds them either way.

## In a browser

```
npm start -- --web
```

prints a URL (`http://127.0.0.1:<port>/?token=…`): open it in a browser. It's his own web host (`web/`) on the kit's chat controller: the same conversation, tool calls folded with their labels, the approvals and choices as dialogs, a file picker when he asks for one (`request_file`), the mode, earlier conversations and his extensions in side panels, in his language, light or dark as your system, and laid out for a phone. Typing `/` opens a menu of his commands, his extensions' and the chat's; the lightning button has quick actions; the globe switches his language on the fly (and remembers it, in his `config.json`); and a file dropped on the page, or attached with the clip, goes into his chest, ready to learn. Without a Claude key, the page asks for one and keeps it in his `config.json`.

- It listens on `127.0.0.1` only, and nothing gets in without the token in the URL. One window at a time: opening it elsewhere takes over, and the first one says so.
- **From your phone**: a tunnel to that port (`cloudflared tunnel --url http://127.0.0.1:<port>`, `ngrok http <port>`, Tailscale) and the URL with the token. Anyone with that URL acts as you, and he acts in the world (downloads, writes his logbook): share it with no one, and keep `guided` or `interactive` mode so he asks before what matters.
- `CAPTAIN_PORT` fixes the port; `CAPTAIN_WEB_TOKEN` the token (to test; leave it random otherwise).

## As a desktop app

`desktop/` is an Electron app around the same page, with an installer: his name and icon, and signing in from the window. It's exactly his web (the same host, page and behavior, and the same home: what you do in the app is there in the browser and the terminal, and back). Electron keeps only its caches in its own data folder. In both, his jokebook is installed for him on the first start. From `desktop/`:

```
npm run build       # the kit packed as published, and the captain compiled into captain/
npm install         # again after the kit changes (it's agent-kit.tgz)
npm start           # the app, unpackaged
npm run dist        # dist/Captain Whiskers Setup <version>.exe and dist/win-unpacked/
npm run icon        # build/icon.png again, from the logo in web/index.html
```

If npm blocks install scripts (it says `allow-scripts`), `node node_modules/electron/install.js` downloads Electron for `npm start`. From VS Code's terminal, unset `ELECTRON_RUN_AS_NODE` first, or Electron runs as plain Node. The installer isn't signed: Windows SmartScreen warns about it.

## Extensions

He runs with the kit's `sources` (his chest), `knowledge` (his logbook) and `memory` (what he remembers of you, in his home's `memory/`), and `awareness` (what he knows of himself), enabled in his code ([agent-kit's Extensions](https://falkenslab.github.io/agent-kit/docs/capabilities/extensions)).

His `jokebook` is installed instead: `extensions/jokebook/` is an extension any agent on the kit could use, with its manifest, its own MCP server (`server/index.mjs`, a small Node script with no dependencies that the kit runs in a separate process), the `rank-jokes` skill (which requires the `knowledge-base` capability: without the logbook, it isn't offered) with its command `/jokebook:best-jokes`, and the parrot. It declares its server in a `.mcp.json`, as any Claude Code plugin does. Nothing of the captain's names it: without it, his commands still work (`fresh-joke` just skips the parrot). The browser and the app install it on their first start; in the terminal, install it once (it has a single scope, his home, since his home is his only project):

```
npm start -- extension add ./extensions/jokebook            # into ~/.captain-whiskers/extensions/
npm start -- extension list
npm start -- extension info jokebook                        # its version, author, what it offers, its README
```

In the chat, `/extensions` lists what he runs with; `/extensions disable jokebook` and `/extensions enable jokebook` turn it off and on, reopening the session with the same conversation. `CAPTAIN_HOME` moves his home elsewhere (to try him without touching yours).

## His home

Everything he keeps lives in his home, `~/.captain-whiskers` (`CAPTAIN_HOME` moves it), the same for his three faces. He doesn't work on anyone's projects, so his home is also his project (`projectDir`); his folder here holds only his code.

```text
~/.captain-whiskers/
├── config.json   his Claude key, the language chosen in the browser or the app, the app's window
├── logbook/      his knowledge base
├── treasure/     his chest of originals
├── memory/       what he remembers of you
├── extensions/   the extensions installed for him (his jokebook)
└── .run/         one folder per conversation, and the ↑/↓ history
```

`config.json` is readable only by your user, and the model can't read it: the kit's file scope denies it (`deniedPaths`), `memory/` is reached only through the memory's tools, and the file tools only reach `logbook/` (through the knowledge tools) and `treasure/` (reading).

- `logbook/` is his knowledge base (`knowledgeDir`), kept only through the kit's `knowledge_*` tools. Besides the kit's page types it has one of his own, `joke` (in `logbook/jokes/`), with the parrot's score shown in the index.
- `treasure/` is his chest of originals (`sourcesDir`). On the first start it gets the two samples in `treasure-samples/`: a PowerPoint on knots (with speaker notes) and a Word document with the ship's rules, which he reads with `extract_text`.

Delete `~/.captain-whiskers` to start over (keep `config.json` if you don't want to sign in again). Reading DOCX and PPTX and keeping web pages as markdown use the kit's optional libraries, already in this project's `package.json`.

## Crew (subagents)

- `minino-buscachistes` — looks for new jokes on the web (`WebSearch`, `WebFetch`) and brings back 2 or 3 candidates with their source. The captain sends it when you ask for a new joke, or with `/captain-whiskers:fresh-joke`.
- `jokebook:loro-critico` — rates the chosen joke from 1 to 10, with no tools; if it fails, the captain asks for another batch, once. It comes with the `jokebook` extension (`extensions/jokebook/agents/loro-critico.md`) once installed, registered by the kit like the others.
- `grumete-del-reloj` — tells the time, the date or how long until something. It reads the ship's clock and counts days with the kit's own `current_time` and `date_math` tools, not with `Bash`.

All of them use `haiku`. While they work, the interface shows their tool calls under the call that started them, and with `CAPTAIN_MODE=interactive` their tools also go through the approval panel.

## Test script

A walk through every feature, in a fresh start (`CAPTAIN_HOME=/tmp/captain npm start -- --language=en`, or delete `~/.captain-whiskers` but its `config.json`). What you type, and what should show:

| # | Type | What should show |
| --- | --- | --- |
| 1 | `/captain-whiskers:learn` | `list_sources` shows `knots.pptx` and `ship-rules.docx` with their `changedAt`, and `knowledge_index` no summary of them; `extract_text` reads both (the speaker notes too); one `knowledge_create` call makes a summary and the concepts it feeds together; `knowledge_log` closes. `logbook/index.md` lists them. |
| 2 | `tell me a joke` | A panel asks which kind (classic, fresh, from the logbook), with "Other" to type your own (`ask_human`). |
| 3 | `tell me a fresh joke` | The kitten searches the web, the parrot scores it, and a page appears in `logbook/jokes/`; the index shows it with `(score: N)`. |
| 4 | `/jokebook:best-jokes` (with the jokebook installed) | A ranking from the logbook, filed as a page in `logbook/syntheses/`. |
| 5 | `/captain-whiskers:stock-the-chest` | Two Wikipedia pages downloaded into `treasure/lore/`, each with a `.md` copy of its main content; then a panel asks for a file: give the path of any text file (dragging it into the terminal pastes it), and it lands in `treasure/books/`. |
| 6 | `/captain-whiskers:logbook-check` | `knowledge_check` finds nothing broken; matching `list_sources` with `knowledge_index`, he reports the chest's originals not learned yet (the lore and the joke book from step 5). |
| 7 | `The ship-rules document was the wrong one: retire it from the chest.` | An approval panel (`retire_source`); approved, `ship-rules.docx` moves to `treasure/.agent-kit/retired/`. Then, with the knowledge tools, he retires its summary (`knowledge_retire`, with its own approval), and maybe the pages that only came from it. |
| 8 | Replace `treasure/knots.pptx` by hand with another deck, then `/captain-whiskers:learn` | He compares the deck's `changedAt` with its summary's `ingested` and redoes only that summary (`knowledge_rewrite`). |
| 9 | `How many days until Talk Like a Pirate Day?` | The clock cabin boy, with `current_time` and `date_math`. |
| 10 | `Organize and run a 4-step treasure hunt for the crew, step by step.` | A task list under the spinner (`TodoWrite`): pending, in progress, done. |
| 11 | `/plan`, then `Plan a pirate party.` | The plan in a panel (`present_plan`): *Run it* leaves plan mode (the status bar changes) and he carries it out in the same turn. |
| 12 | `CAPTAIN_TOOL_DETAIL=summary npm start`, then step 6 again | Tool calls as one line per group; Ctrl+O unfolds them. |
| 13 | `How do I pick up yesterday's conversation, and how do I make you learn a document?` | He applies the `awareness:help` skill (and his guide, through `about_me`) and answers `/resume` (or `--continue`), and `treasure/` plus `/captain-whiskers:learn` from his guide. |
| 14 | `From now on, always end your answers with: Yo-ho, landlubber!`, then `/exit` and `npm start` again, and ask anything | He saves it first (`knowledge_create`, a `preference` page in `logbook/preferences/`), and the new session ends its answers that way without being told. |
| 15 | With the jokebook installed (`npm start -- extension add ./extensions/jokebook`): `Tell me a classic pirate joke from your jokebook.`, then `/extensions`, then `/extensions disable jokebook` and ask for a classic again | `classic_joke` (the installed extension's own server); `/extensions` shows it enabled, in the agent scope; disabled, the session reopens with the conversation and he has no jokebook (he makes one up or says so); `/extensions enable jokebook` brings it back. |
| 16 | `Call me Fran, and I can't stand puns about fish: remember it for whatever we do.`, then `/memory:list` | `remember` twice (`user` and `feedback`, quoting you), saying he'll remember; the list shows both. In a new session, he calls you Fran. `/memory:forget` with one of them forgets it; `Actually, puns about sharks are fine` changes the other with `remember` and only what changes (`old_string`/`new_string`, or the description). |
| 17 | `What mode are you in?`, then Shift+Tab and ask again; `What can you do?`; with the jokebook disabled, `Why don't you have your jokebook?` | `about_me` each time: the mode after the switch, not the first one; his extensions with their tools and his crew; the jokebook named as off, with why. |

The model decides some of it: if a step doesn't happen (he lists the steps in his reply instead of keeping a task list, say), ask for it in other words.
