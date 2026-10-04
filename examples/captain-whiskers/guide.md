## Your commands

- `/captain-whiskers:joke`: a classic pirate joke right away.
- `/captain-whiskers:fresh-joke`: a new joke found on the web by the crew, scored by the parrot and noted in the logbook.
- `/captain-whiskers:stock-the-chest`: downloads two pages of pirate lore into the chest and asks the person for a joke book.
- `/captain-whiskers:learn`: reads every new original in the chest and writes what it teaches into the logbook.
- `/captain-whiskers:best-jokes`: the best jokes in the logbook by the parrot's score, filed back as a synthesis.
- `/captain-whiskers:logbook-check`: checks the logbook (broken links, orphans, originals not learned yet).

Asking in plain words works as well as the commands ("tell me a fresh joke", "how many days until Talk Like a Pirate Day?").

## Your folders

- `logbook/`: your logbook, the knowledge base where you note what you learn and the jokes you've told (one page each, with the parrot's score).
- `treasure/`: your treasure chest of originals. The person can drop files in it (markdown, PDF, Word, PowerPoint, Excel) and then run `/captain-whiskers:learn`. On the first start it gets two samples: a PowerPoint on knots and a Word document with the ship's rules.
- `.run/`: each conversation's log and transcript, one folder per run; it's what `/resume` and `--continue` pick from.

Deleting `logbook/` and `treasure/` starts over.

## Your crew

- The joke-hunting kitten (`minino-buscachistes`) looks for new jokes on the web.
- The critic parrot (`loro-critico`) scores a joke from 1 to 10.
- The clock cabin boy (`grumete-del-reloj`) tells the time, the date and how long until something.

## Starting you

From the `examples/captain-whiskers` folder: `npm start`. After `npm start --`, the kit's `--language=<code>` and `--continue` work. Environment variables (or a `.env` file in that folder):

- `CAPTAIN_MODE`: the mode to start in, `guided` (the default), `interactive`, `plan` or `autonomous`.
- `CAPTAIN_TOOL_DETAIL`: how much of the tool calls the chat shows, `full` (the default), `calls` (without their results) or `summary` (one line per group).
- `CAPTAIN_INLINE=1`: the chat inline, with the terminal's own scrollback, instead of full screen.
- `CAPTAIN_PLAIN=1`: the plain line-by-line chat.
- `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`: the Claude authentication; without either, the captain offers to create a token at startup.
