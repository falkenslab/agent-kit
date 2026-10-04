---
sidebar_position: 1
title: Captain Whiskers
description: A walk through the kit's example agent, piece by piece.
---

# Captain Whiskers

[Captain Whiskers](https://github.com/falkenslab/agent-kit/tree/main/examples/captain-whiskers) is the kit's example: a retired pirate cat who tells jokes in the terminal. It's small, but it uses most of the kit, so it's the best template for an agent of your own.

![Captain Whiskers running full screen in Windows Terminal](/captain-whiskers.png)

## Running it

From a clone of the kit:

```bash
npm install && npm run build           # the kit, once and after each change to it
cd examples/captain-whiskers
npm install
npm start                               # full screen, in the system's language
npm start -- --language=en              # in English
npm start -- --continue                 # resume the latest conversation
CAPTAIN_MODE=interactive npm start      # ask before every tool call (guided by default)
CAPTAIN_TOOL_DETAIL=summary npm start   # tool calls as one line per group
CAPTAIN_INLINE=1 npm start              # inline, with the terminal's scrollback
CAPTAIN_PLAIN=1 npm start               # the plain readline chat
```

It needs `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` in the environment or in `examples/captain-whiskers/.env`; without one, it offers to create a token.

## Files

```text
examples/captain-whiskers/
├── agent.ts                    everything: texts, tools, crew, spec, chat
├── package.json                "@falkenslab/agent-kit": "file:../.."
├── plugin/
│   ├── .claude-plugin/plugin.json   { "name": "captain-whiskers" }
│   ├── skills/pirate-joke/SKILL.md  how to build a pirate pun
│   ├── skills/miau/SKILL.md         keep the feline tone
│   ├── commands/joke.md             /captain-whiskers:joke
│   ├── commands/fresh-joke.md       /captain-whiskers:fresh-joke
│   ├── commands/stock-the-chest.md  /captain-whiskers:stock-the-chest
│   ├── commands/learn.md            /captain-whiskers:learn
│   ├── commands/best-jokes.md       /captain-whiskers:best-jokes
│   └── commands/logbook-check.md    /captain-whiskers:logbook-check
├── treasure-samples/            a PPTX on knots and a DOCX of the ship's rules
├── logbook/                     his knowledge base (git-ignored)
├── treasure/                    his chest of originals (git-ignored)
└── .run/                        one folder per run (git-ignored)
```

## 1. Environment and language

```ts
const envPath = path.join(__dirname, ".env");
try {
  process.loadEnvFile(envPath);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const { language } = detectLanguage();
```

`detectLanguage()` resolves the kit's language (`--language`, else the system's) so the captain can pick his own texts: his name and on-screen texts come in the four languages, in a `TEXTS` record keyed by language. See [Languages](../sessions/languages.md#an-agents-own-texts).

## 2. The kit's clock

The clock cabin boy needs the time and has to count days. Rather than giving a subagent `Bash`, he uses the kit's own date and time tools, `current_time` and `date_math`, which every session has (see [The kit's own tools](../capabilities/tools-and-mcp.md#date-and-time)). The captain registers no MCP server of his own: for one, see [In-process tools](../capabilities/tools-and-mcp.md#in-process-tools-tool-and-createsdkmcpserver).

## 3. The prompts, in English

```ts
const SYSTEM_PROMPT = `You are ${text.name}, a retired pirate cat who now "commands" this terminal as if it
were the bridge of a ship. …

Your crew (subagents, launch them with the Agent tool):
- minino-buscachistes: if you're asked for a new or fresh joke, …, send them to find candidates on the web.
- loro-critico: before telling a joke the kitten brought, pass them the one you like best. …
- grumete-del-reloj: if you're asked the time, the date or how long until something, ask them.

Be brief: 3-4 sentences per reply at most, always in character.`;
```

Everything the model reads (prompts, skills, commands) is in English, with the captain's name in the chosen language: text in another language pulls the replies towards it.

## 4. The crew

```ts
const SUBAGENTS: Record<string, AgentDefinition> = {
  "minino-buscachistes": {
    description: "Kitten cabin boy who searches the web for short jokes about pirates, cats or sailors and returns candidates with their source.",
    prompt: `You are Minino, the youngest cabin boy on ${text.name}'s ship. …`,
    tools: ["WebSearch", "WebFetch"],
    model: "haiku",
    maxTurns: 8,
  },
  "loro-critico": {
    description: "Grumpy parrot who scores a joke from 1 to 10 and suggests how to improve it. Uses no tools.",
    prompt: `You are Perico, ${text.name}'s grumpy parrot. …`,
    tools: [],
    model: "haiku",
    maxTurns: 1,
  },
  "grumete-del-reloj": {
    description: "Cabin boy who reads the ship's clock (the system's date and time) and works out dates and how long until something.",
    prompt: "You are the clock cabin boy. Read the ship's clock with the current_time tool, and work out any date … with the date_math tool …",
    tools: ["mcp__time__current_time", "mcp__time__date_math"],
    model: "haiku",
    maxTurns: 3,
  },
};
```

Three small subagents on `haiku`: one searches the web, one only thinks, one uses the kit's date and time tools. See [Subagents](../capabilities/subagents.md).

## 5. The spec

```ts
const JOKE_PAGE: PageType = {
  type: "joke",
  dir: "jokes",
  indexSection: "Jokes",
  description: "A joke the captain told or the crew found: the joke itself, where it comes from and the parrot's score (field score, 1-10).",
  template: `<The joke, word for word.>\n\n## Where it comes from\n- …\n\n## The parrot's verdict\n- …`,
  indexFields: ["score"],
};

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildMcpServers: () => ({}),
  pluginRoots: () => [path.join(__dirname, "plugin")],
  buildSubagents: () => ({ agents: SUBAGENTS, allowedSubagentTypes: Object.keys(SUBAGENTS) }),
  knowledgePageTypes: [JOKE_PAGE],
  skills: ["captain-whiskers:pirate-joke", "captain-whiskers:miau"],
  settingSources: [],
};
```

- `knowledgePageTypes`: his logbook has a page type of its own, `joke`, kept in `logbook/jokes/` with the parrot's score in its index line. See [Your own page types](../capabilities/knowledge-base.md#your-own-page-types).
- `skills` and `settingSources: []`: only his two skills (the kit adds the knowledge base's), and nothing from the machine's Claude Code configuration. See [Context and cost](../sessions/context-and-cost.md).

## 6. The chat

```ts
const runsDir = path.join(__dirname, ".run");
const modes: Mode[] = ["autonomous", "guided", "interactive", "plan"];
const mode = modes.find((m) => m === process.env.CAPTAIN_MODE) ?? "guided";
await stockTheChest(treasure); // the samples, on the first start
const config: BaseSessionConfig = { mode, projectDir: __dirname, knowledgeDir: logbook, sourcesDir: treasure };
const toolDetail = details.find((d) => d === process.env.CAPTAIN_TOOL_DETAIL) ?? "full";

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir,
  header: { title: text.name, fields: { [text.mode]: messagesFor(language).mode(mode) }, art: LOGO },
  mode,
  theme: { accent: "#e5b53a", selection: "#e5b53a" },
  plain: process.env.CAPTAIN_PLAIN === "1",
  toolDetail,
  fullscreen: process.env.CAPTAIN_INLINE !== "1",
  firstPromptSuggestion: text.suggestion,
  welcomeMessage: pc.gray(text.welcome),
  promptLabel: `\n${ui.user(text.you)} `,
  agentLabel: ui.agent(`${text.name}>`),
  historyPath: path.join(runsDir, "history.jsonl"),
});
```

- **A session opener with `runsDir`**: every run in `.run/<timestamp>/`, resumable with `--continue` or `/resume`.
- **The header**: the translated name, the mode in the kit's language, and a logo in single-column block characters.
- **A theme**: the approval panels' border and the focused option in doubloon gold; everything else keeps the kit's colors.
- **The first suggestion**: Tab takes it before the first turn.
- **Guided by default**, so he can ask: which kind of joke (`ask_human`), a file (`request_file`), whether to retire an original.

## 7. The logbook and the chest

`logbook/` is his [knowledge base](../capabilities/knowledge-base.md), reached only through the `knowledge_*` tools; `treasure/` is his chest of [originals](../capabilities/knowledge-base.md#sources-originals-kept-as-obtained). His prompt and commands put them to work:

- `/captain-whiskers:learn` ingests the chest: `list_sources`, `extract_text` on the PPTX (speaker notes included) and the DOCX, one `knowledge_create` call for a summary and the concepts it feeds, `knowledge_log`.
- A fresh joke the parrot scored becomes a `joke` page; `/captain-whiskers:best-jokes` ranks them and files the ranking as a synthesis.
- `/captain-whiskers:stock-the-chest` downloads two pages (`download_to_sources`, kept as markdown too) and asks for a joke book (`request_file`).
- "That document was the wrong one" ends in `retire_source`, with approval, and its summary marked retired.
- `/captain-whiskers:logbook-check` runs `knowledge_check`.

The optional libraries for DOCX, PPTX and web pages are in his `package.json` (see [Installation](../getting-started/installation.md#optional-libraries)).

## Things to try

His README has a test script that goes through every feature in order. A few:

- `/captain-whiskers:joke` for a classic, `/captain-whiskers:fresh-joke` to send the crew to the web.
- "What time is it, and how long until Talk Like a Pirate Day?" (the clock cabin boy, with `current_time` and `date_math`).
- "Organize and run a 4-step treasure hunt, step by step": a task list under the spinner.
- `/plan`, then "Plan a pirate party": the plan in a panel, and *Run it* leaves plan mode.
- `CAPTAIN_MODE=interactive npm start` and watch every tool call stop at the approval panel; Shift+Tab switches to plan, then guided.
- `CAPTAIN_MODE=plan npm start` and ask for something: the crew can search, read the clock and the logbook, and anything else is denied until the plan is approved or you leave plan mode.
- Ctrl+O to fold the tool calls; drag and right-click to copy; `?` for the shortcuts.
- `/exit`, then `npm start -- --continue`.
