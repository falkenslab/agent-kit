# Captain Whiskers

A small agent built on agent-kit: a retired pirate cat who tells jokes in a terminal chat, keeps a logbook of what he learns and a treasure chest of originals. It uses most of the kit, so it doubles as its end-to-end check. He speaks the kit's language, the system's or the one given with `npm start -- --language=fr` (`en`, `es`, `fr`, `de`): his name (Capitán Bigotes, Captain Whiskers, Capitaine Moustaches, Käpt'n Schnurrbart), his on-screen texts and the kit's follow it, and he answers in it. Everything the model reads (prompts, skills, commands) is in English, since text in another language pulls the replies towards it; only his crew keeps Spanish names. It's a standalone project that uses the kit through `file:../..`.

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

It needs Claude authentication: `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`) in the environment or in a `.env` file in this folder (ignored by git), loaded at startup; what's already in the environment wins over the file. If there's no token, it offers to create one with `claude setup-token` and saves it to `.env` for next time.

## Usage

Type as usual, and `/exit` to leave. His commands:

| Command | What it does |
| --- | --- |
| `/captain-whiskers:joke` | A classic pirate joke right away |
| `/captain-whiskers:fresh-joke` | A new joke found on the web by the crew, scored by the parrot and noted in the logbook |
| `/captain-whiskers:stock-the-chest` | Downloads two pages of pirate lore into the chest and asks you for a joke book |
| `/captain-whiskers:learn` | Reads every new original in the chest and writes what it teaches into the logbook |
| `/captain-whiskers:best-jokes` | The best jokes in the logbook by the parrot's score (his jokebook's `rank-jokes` skill), filed back as a synthesis |
| `/captain-whiskers:logbook-check` | Checks the logbook (broken links, orphans, originals not learned yet) |

The kit's own `/knowledge:ingest`, `/knowledge:query` and `/knowledge:lint` work too.

He knows who he is and how he's used: the spec's `identity` gives the model his name, his version and agent-kit's, and the kit's `agent-help` skill answers questions such as "how do I resume a conversation?" from the kit's chat and from his own [guide.md](guide.md) (his commands, folders and settings).

↑/↓ bring back earlier messages, Tab completes `/commands` and Esc interrupts the reply in progress. Each run keeps its session log, its transcript and the conversation in `.run/<date-time>/` (ignored by git): `npm start -- --continue` picks up the latest one, and `/resume` lists them to pick one. The ↑/↓ history lives in `.run/history.jsonl`.

In a terminal it uses the kit's Ink interface (`runChatInk`) full screen: the prompt stays at the bottom, PageUp/PageDown and the mouse wheel scroll through the conversation and Ctrl+End (or typing) goes back to the bottom; drag with the mouse to select and right-click to copy to the clipboard. With `CAPTAIN_INLINE=1` it uses the inline mode (with the terminal's own scrollback), and without a TTY, or with `CAPTAIN_PLAIN=1`, the plain readline chat.

It runs in `guided` mode by default, so it can ask you things: which kind of joke, a file, whether to retire an original. With `CAPTAIN_MODE=interactive` it asks for approval before every tool (the panel takes `1`-`3` or `y`/`n`/`q`, and it can also be answered by writing to `.run/<date-time>/approval-response.txt`), and with `CAPTAIN_MODE=autonomous` it asks nothing. With `CAPTAIN_MODE=plan` it only reads and plans: its crew can still search the web, read the ship's clock and the logbook, and anything else is denied until the plan is approved (`present_plan`) or you leave plan mode. Started in any mode but `autonomous`, Shift+Tab cycles through `guided`, `interactive` and `plan`. `/plan` goes into plan mode and back.

It shows every tool call with its result (`toolDetail: "full"`, the kit's default); `CAPTAIN_TOOL_DETAIL=calls` shows the calls without their results, and `CAPTAIN_TOOL_DETAIL=summary` one line per group. Ctrl+O unfolds them either way.

## Extensions

He runs with three ([agent-kit's Extensions](https://falkenslab.github.io/agent-kit/docs/capabilities/extensions)): the kit's `sources` (his chest) and `knowledge` (his logbook), and his own `jokebook`, in `jokebook.ts` with its plugin in `extensions/jokebook/`. The jokebook brings the `classic_joke` tool (a classic from his book) and the `rank-jokes` skill, which requires the `knowledge-base` capability: without the logbook, it isn't offered.

## Logbook and treasure chest

- `logbook/` is his knowledge base (`knowledgeDir`), kept only through the kit's `knowledge_*` tools. Besides the kit's page types it has one of his own, `joke` (in `logbook/jokes/`), with the parrot's score shown in the index.
- `treasure/` is his chest of originals (`sourcesDir`). On the first start it gets the two samples in `treasure-samples/`: a PowerPoint on knots (with speaker notes) and a Word document with the ship's rules, which he reads with `extract_text`.

Both are ignored by git: delete them to start over. Reading DOCX and PPTX and keeping web pages as markdown use the kit's optional libraries, already in this project's `package.json`.

## Crew (subagents)

- `minino-buscachistes` — looks for new jokes on the web (`WebSearch`, `WebFetch`) and brings back 2 or 3 candidates with their source. The captain sends it when you ask for a new joke, or with `/captain-whiskers:fresh-joke`.
- `loro-critico` — rates the chosen joke from 1 to 10, with no tools; if it fails, the captain asks for another batch, once.
- `grumete-del-reloj` — tells the time, the date or how long until something. It reads the ship's clock and counts days with the kit's own `current_time` and `date_math` tools, not with `Bash`.

All of them use `haiku`. While they work, the interface shows their tool calls under the call that started them, and with `CAPTAIN_MODE=interactive` their tools also go through the approval panel.

## Test script

A walk through every feature, in a fresh start (`rm -rf logbook treasure`, then `npm start -- --language=en`). What you type, and what should show:

| # | Type | What should show |
| --- | --- | --- |
| 1 | `/captain-whiskers:learn` | `list_sources` shows `knots.pptx` and `ship-rules.docx` with their `changedAt`, and `knowledge_index` no summary of them; `extract_text` reads both (the speaker notes too); one `knowledge_create` call makes a summary and the concepts it feeds together; `knowledge_log` closes. `logbook/index.md` lists them. |
| 2 | `tell me a joke` | A panel asks which kind (classic, fresh, from the logbook), with "Other" to type your own (`ask_human`). |
| 3 | `tell me a fresh joke` | The kitten searches the web, the parrot scores it, and a page appears in `logbook/jokes/`; the index shows it with `(score: N)`. |
| 4 | `/captain-whiskers:best-jokes` | A ranking from the logbook, filed as a page in `logbook/syntheses/`. |
| 5 | `/captain-whiskers:stock-the-chest` | Two Wikipedia pages downloaded into `treasure/lore/`, each with a `.md` copy of its main content; then a panel asks for a file: give the path of any text file (dragging it into the terminal pastes it), and it lands in `treasure/books/`. |
| 6 | `/captain-whiskers:logbook-check` | `knowledge_check` finds nothing broken; matching `list_sources` with `knowledge_index`, he reports the chest's originals not learned yet (the lore and the joke book from step 5). |
| 7 | `The ship-rules document was the wrong one: retire it from the chest.` | An approval panel (`retire_source`); approved, `ship-rules.docx` moves to `treasure/.agent-kit/retired/`. Then, with the knowledge tools, he retires its summary (`knowledge_retire`, with its own approval), and maybe the pages that only came from it. |
| 8 | Replace `treasure/knots.pptx` by hand with another deck, then `/captain-whiskers:learn` | He compares the deck's `changedAt` with its summary's `ingested` and redoes only that summary (`knowledge_rewrite`). |
| 9 | `How many days until Talk Like a Pirate Day?` | The clock cabin boy, with `current_time` and `date_math`. |
| 10 | `Organize and run a 4-step treasure hunt for the crew, step by step.` | A task list under the spinner (`TodoWrite`): pending, in progress, done. |
| 11 | `/plan`, then `Plan a pirate party.` | The plan in a panel (`present_plan`): *Run it* leaves plan mode (the status bar changes) and he carries it out in the same turn. |
| 12 | `CAPTAIN_TOOL_DETAIL=summary npm start`, then step 6 again | Tool calls as one line per group; Ctrl+O unfolds them. |
| 13 | `How do I pick up yesterday's conversation, and how do I make you learn a document?` | He applies the `agent-kit:agent-help` skill and answers `/resume` (or `--continue`), and `treasure/` plus `/captain-whiskers:learn` from his guide. |
| 14 | `From now on, always end your answers with: Yo-ho, landlubber!`, then `/exit` and `npm start` again, and ask anything | He saves it first (`knowledge_create`, a `preference` page in `logbook/preferences/`), and the new session ends its answers that way without being told. |
| 15 | `Tell me a classic pirate joke from your jokebook.`, then `What extensions do you have?` | `classic_joke` (his own extension's tool); then `agent-help`, naming sources, knowledge and jokebook. |

The model decides some of it: if a step doesn't happen (he lists the steps in his reply instead of keeping a task list, say), ask for it in other words.
