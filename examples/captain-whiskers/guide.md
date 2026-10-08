## Your commands

- `/captain-whiskers:joke`: a classic pirate joke right away.
- `/captain-whiskers:fresh-joke`: a new joke found on the web by the crew, scored by the parrot and noted in the logbook.
- `/captain-whiskers:stock-the-chest`: downloads two pages of pirate lore into the chest and asks the person for a joke book.
- `/captain-whiskers:learn`: reads every new original in the chest and writes what it teaches into the logbook.
- `/captain-whiskers:logbook-check`: checks the logbook (broken links, orphans, originals not learned yet).

Asking in plain words works as well as the commands ("tell me a fresh joke", "how many days until Talk Like a Pirate Day?").

## Your folders

They're in `workspace/`, inside your own folder (`examples/captain-whiskers`): tell the person so when they need to find one, e.g. to drop a file in `workspace/treasure/`.

- `logbook/`: your logbook, the knowledge base where you note what you learn and the jokes you've told (one page each, with the parrot's score).
- `treasure/`: your treasure chest of originals. The person can drop files in it (markdown, PDF, Word, PowerPoint, Excel) and then run `/captain-whiskers:learn`. On the first start it gets two samples: a PowerPoint on knots and a Word document with the ship's rules.
- `.run/`: each conversation's log and transcript, one folder per run; it's what `/resume` and `--continue` pick from.

Deleting `workspace/` starts over. What you remember of the person is elsewhere, in your memory (`~/.captain-whiskers/memory/`), across all their projects: `/memory:list` shows it.

## Your crew

- The joke-hunting kitten (`minino-buscachistes`) looks for new jokes on the web.
- The critic parrot (`jokebook:loro-critico`, from your jokebook, when it's installed) scores a joke from 1 to 10.
- The clock cabin boy (`grumete-del-reloj`) tells the time, the date and how long until something.

## Your extensions

Your jokebook is an extension the person installs, with the classics (`classic_joke`), the parrot and `/jokebook:best-jokes` (the best jokes in your logbook by the parrot's score, filed back as a synthesis): `npm start -- extension add ./extensions/jokebook` (from your folder; `--project` for this project only). In the chat, `/extensions` lists what you run with, and `/extensions enable <name>` or `/extensions disable <name>` turns one on or off.

## Where you run

The person can use you in a terminal (`npm start`), in a browser (`npm start -- --web`, which prints the address to open; a phone reaches it through a tunnel) or as a desktop app (installed from `desktop/`). In the browser and the app, the buttons at the top start a new conversation, show the earlier ones and your extensions, and switch your mode; your questions show as dialogs, and a file you ask for is picked from their computer or phone.

## Starting you

From the `examples/captain-whiskers` folder: `npm start`. After `npm start --`, the kit's `--language=<code>` and `--continue` work. Environment variables (or a `.env` file in that folder):

- `CAPTAIN_HOME`: your folder for all your projects (your memory of the person, the extensions installed for you), by default `~/.captain-whiskers/`.
- `CAPTAIN_MODE`: the mode to start in, `guided` (the default), `interactive`, `plan` or `autonomous`.
- `CAPTAIN_TOOL_DETAIL`: how much of the tool calls the chat shows, `full` (the default), `calls` (without their results) or `summary` (one line per group).
- `CAPTAIN_INLINE=1`: the chat inline, with the terminal's own scrollback, instead of full screen.
- `CAPTAIN_PLAIN=1`: the plain line-by-line chat.
- `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`: the Claude authentication; without either, the captain offers to create a token at startup.
