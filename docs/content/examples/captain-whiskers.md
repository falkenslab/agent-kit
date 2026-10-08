---
sidebar_position: 1
title: Captain Whiskers
description: What the kit's example agent can do, with screenshots, and a walk through his code, piece by piece.
---

# Captain Whiskers

[Captain Whiskers](https://github.com/falkenslab/agent-kit/tree/main/examples/captain-whiskers) is the kit's example: a retired pirate cat who tells jokes in the terminal, keeps a logbook of what he learns and a chest of original documents. It's small, but it uses most of the kit, so it's the best template for an agent of your own.

![Captain Whiskers running full screen in Windows Terminal](/captain-whiskers.png)

This page first shows what he can do, each thing with a screenshot from a real session and the piece of the kit behind it, and then [walks through his code](#running-it).

## What he can do

### Talk

He answers in the chat as you'd expect from Claude Code: the reply streams in with its markdown already formatted, tables drawn as grids, his tool calls folded under each step. All of it is the kit's [Ink chat](../terminal-ui/ink-chat.md); the captain only gives it a header, a theme and his texts.

![The captain answers with a table of jokes and their scores](/captain/conversation.png)

### Send his crew

He has three [subagents](../capabilities/subagents.md): a kitten that searches the web for jokes, a grumpy parrot that scores them and a cabin boy who reads the clock. The chat shows each subagent's own tool calls under the call that started it. The kit's [subagent gates](../security/subagent-gates.md) keep them to their declared types and tools, and in the foreground.

![The kitten searches the web twice and the parrot scores each joke](/captain/crew.png)

### Ask you

When he needs you to choose, he asks in a panel instead of ending his turn with a question, and goes on with your answer in the same turn. "Other" lets you type your own. That's the kit's [`ask_human`](../human-in-the-loop/choices-and-plans.md) tool.

![A panel asks which kind of joke: classic, fresh or from the logbook](/captain/ask.png)

### Stock his chest

His chest (`treasure/`) holds the original documents he learns from, which he can read but never change. He downloads web pages into it, kept as markdown too so he can quote them, and asks you for files of yours. Those are the kit's [sources tools](../capabilities/knowledge-base.md#sources-originals-kept-as-obtained): `download_to_sources` and `request_file`. Nothing is overwritten, and an identical file isn't copied twice.

![Two Wikipedia pages downloaded into the chest, then a panel asking for a joke book](/captain/chest.png)

### Learn from it

`/captain-whiskers:learn` reads every original he hasn't learned yet, PowerPoint speaker notes included, and writes what it teaches into his logbook: a summary of each document and a page per concept, created together. `list_sources` tells what's new, [`extract_text`](../capabilities/knowledge-base.md#adding-originals) reads Word and PowerPoint, and the [`knowledge_*` tools](../capabilities/knowledge-base.md#the-tools) keep the logbook.

![The captain reads a PowerPoint and a Word document and creates the logbook pages](/captain/learn.png)

### Remember

His logbook (`logbook/`) is his memory across sessions: a wiki of pages he reaches only through the knowledge tools. Besides the kit's page types it has one of his own, `joke`, with the parrot's score shown in the index ([your own page types](../capabilities/knowledge-base.md#your-own-page-types)). With his jokebook installed, `/jokebook:best-jokes` ranks them and files the ranking back as a page.

![The captain ranks the jokes in his logbook by the parrot's score](/captain/remember.png)

### Set things right

Told that a document was the wrong one, he asks before taking it out of the chest: [`retire_source`](../capabilities/knowledge-base.md#retiring-an-original) moves it aside instead of deleting it, and then he retires its summary page with the logbook's own tools (asking again), so he no longer relies on it.

![An approval panel to retire the ship's rules document](/captain/retire.png)

### Know the date

The cabin boy answers "how many days until…" with the kit's [`current_time` and `date_math`](../capabilities/tools-and-mcp.md#date-and-time), rather than counting on his paws.

![The cabin boy works out the days until Talk Like a Pirate Day](/captain/date.png)

### Organize a mission

For anything with several steps he keeps a task list, drawn under the spinner as he goes: pending, in progress, done. That's the SDK's `TodoWrite`, [drawn by the chat](../terminal-ui/ink-chat.md#whats-on-screen).

![A treasure hunt's four steps, two done and one in progress](/captain/tasks.png)

### Plan before acting

In [plan mode](../core-concepts/modes.md#plan) he can only read and plan. When the plan is ready, he presents it: *Run it* leaves plan mode and he carries it out in the same turn; *Keep planning* lets you say what to change.

![A party plan in a panel, with Run it, Keep planning and Cancel](/captain/plan.png)

### Go step by step

In interactive mode the kit's [step gate](../human-in-the-loop/step-gate.md) stops every tool call, his crew's included, until you approve it. `CAPTAIN_MODE=interactive npm start`, or Shift+Tab in any mode but autonomous.

![The step gate asks before the captain delegates to the cabin boy](/captain/step-gate.png)

### Explain himself

He has the kit's [awareness](../capabilities/awareness.md): asked what mode he's in or what he can do, he looks at himself (`about_me`) and answers with the mode after a Shift+Tab, his extensions and their tools, what's off and why, his crew; asked how to do something, he loads the `help` skill for the chat (resuming, keys, modes) and `about_me`'s guide for his own commands, folders and settings (his `guide.md`).

![The captain explains /resume and how to make him learn a document](/captain/agent-help.png)

### Bring his own extension

Besides the kit's `sources`, `knowledge` and `memory` (what he remembers of whoever sails with him, in `~/.captain-whiskers/memory/`, across all their projects: see [Memory of the person](../capabilities/memory.md)), he can be given more. His `jokebook` is one any agent on the kit could install: a folder in his project (`extensions/jokebook/`) with its manifest, its own MCP server (a small Node script the kit runs in a separate process), a skill and the parrot. Install it with `npm start -- extension add ./extensions/jokebook` (for all his projects, in `~/.captain-whiskers/extensions/`) or with `--project` (only this one, in `workspace/extensions/`). Its tool, `classic_joke`, tells a classic from the book; its skill, `rank-jokes`, ranks his logbook's jokes, and requires the `knowledge-base` capability, so it's only offered with the logbook on. In the chat, `/extensions` lists what he runs with, and `/extensions disable jokebook` turns it off without leaving the conversation. See [Extensions](../capabilities/extensions.md#installing-extensions).

### Speak your language

He speaks the kit's language, the system's or the one given with `--language`: his name, his texts, the kit's own and his replies. Here as Capitán Bigotes. See [Languages](../sessions/languages.md).

![The same captain in Spanish, as Capitán Bigotes](/captain/languages.png)

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
npm start -- --web                      # in a browser: prints the URL to open
```

As a desktop app, from `examples/captain-whiskers/desktop/`: `npm run build`, `npm install`, then `npm start` (unpackaged) or `npm run dist` (the installer).

It needs `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` in the environment or in `examples/captain-whiskers/.env`; without one, it offers to create a token.

## Files

```text
examples/captain-whiskers/
├── captain.ts                  what makes him: texts, prompt, crew, spec, his config
├── agent.ts                    the terminal (and --web)
├── web/                        his web host on the chat controller, and its page
├── desktop/                    his Electron app and installer
├── guide.md                    his own help guide (commands, folders, settings)
├── extensions/jokebook/        an installable extension: manifest, .mcp.json and its server, skill, command, parrot
├── package.json                "@falkenslab/agent-kit": "file:../.."
├── plugin/
│   ├── .claude-plugin/plugin.json   { "name": "captain-whiskers" }
│   ├── skills/pirate-joke/SKILL.md  how to build a pirate pun
│   ├── skills/miau/SKILL.md         keep the feline tone
│   ├── commands/joke.md             /captain-whiskers:joke
│   ├── commands/fresh-joke.md       /captain-whiskers:fresh-joke
│   ├── commands/stock-the-chest.md  /captain-whiskers:stock-the-chest
│   ├── commands/learn.md            /captain-whiskers:learn
│   └── commands/logbook-check.md    /captain-whiskers:logbook-check
├── treasure-samples/            a PPTX on knots and a DOCX of the ship's rules
└── workspace/                   his project, git-ignored: everything he keeps
    ├── logbook/                 his knowledge base
    ├── treasure/                his chest of originals
    └── .run/                    one folder per run
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
- jokebook:loro-critico (the parrot, from your jokebook): before telling a joke the kitten brought, pass them the one you like best. …
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
  "grumete-del-reloj": {
    description: "Cabin boy who reads the ship's clock (the system's date and time) and works out dates and how long until something.",
    prompt: "You are the clock cabin boy. Read the ship's clock with the current_time tool, and work out any date … with the date_math tool …",
    tools: ["mcp__time__current_time", "mcp__time__date_math"],
    model: "haiku",
    maxTurns: 3,
  },
};
```

Two small subagents on `haiku` in his code: one searches the web, one uses the kit's date and time tools. The third, the parrot, only thinks, and comes with the `jokebook` extension as `agents/loro-critico.md`: installed, the kit registers it as `jokebook:loro-critico`, like the others. See [Subagents](../capabilities/subagents.md#subagents-in-a-plugin).

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

const { version } = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8")) as { version: string };

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  identity: { name: text.name, version, description: "a retired pirate cat who tells jokes, an example agent of agent-kit" },
  helpGuide: path.join(__dirname, "guide.md"),
  buildMcpServers: () => ({}),
  pluginRoots: () => [path.join(__dirname, "plugin")],
  buildSubagents: () => ({ agents: SUBAGENTS, allowedSubagentTypes: Object.keys(SUBAGENTS) }),
  extensions: ["awareness", "sources", "knowledge", "memory"],
  knowledgePageTypes: [JOKE_PAGE],
  skills: "plugins",
  settingSources: [],
};
```

- `identity` and `helpGuide`, with the `awareness` extension: the model knows his name, his version and agent-kit's, what he is at each moment (`about_me`), how his chat is used (the `help` skill) and his `guide.md`. See [Awareness](../capabilities/awareness.md).
- `extensions`: the kit's `sources` (his chest, `treasure/`), `knowledge` (his logbook, `logbook/`) and `memory`, enabled by name. His jokebook isn't here: it's installed (see below). See [Extensions](../capabilities/extensions.md).
- `knowledgePageTypes`: his logbook has a page type of its own, `joke`, kept in `logbook/jokes/` with the parrot's score in its index line. See [Your own page types](../capabilities/knowledge-base.md#your-own-page-types).
- `skills: "plugins"` and `settingSources: []`: only the skills of his plugins (his own, the logbook's and the awareness's), not the twenty the SDK brings, and nothing from the machine's Claude Code configuration. See [Context and cost](../sessions/context-and-cost.md).

## 6. The chat

```ts
const workspace = path.join(__dirname, "workspace"); // everything he keeps, git-ignored
const runsDir = path.join(workspace, ".run");
const logbook = path.join(workspace, "logbook");
const treasure = path.join(workspace, "treasure");
const modes: Mode[] = ["autonomous", "guided", "interactive", "plan"];
const mode = modes.find((m) => m === process.env.CAPTAIN_MODE) ?? "guided";
await stockTheChest(treasure); // the samples, on the first start
const config: BaseSessionConfig = {
  mode,
  projectDir: workspace, // the model sees logbook/ and treasure/
  knowledgeDir: logbook,
  sourcesDir: treasure,
  memoryDir: path.join(home, "memory"), // home: ~/.captain-whiskers, or CAPTAIN_HOME
  extensionDirs: { agent: path.join(home, "extensions"), project: path.join(workspace, "extensions") },
};
const toolDetail = details.find((d) => d === process.env.CAPTAIN_TOOL_DETAIL) ?? "full";

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir,
  header: { title: text.name, fields: { [text.mode]: messagesFor(language).mode(mode), "agent-kit": agentKitVersion() }, art: LOGO },
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

- **A session opener with `runsDir`**: every run in `workspace/.run/<timestamp>/`, resumable with `--continue` or `/resume`.
- **The header**: the translated name, the mode in the kit's language, the version of agent-kit he runs on (`agentKitVersion()`), and a logo in single-column block characters.
- **A theme**: the approval panels' border and the focused option in doubloon gold; everything else keeps the kit's colors.
- **The first suggestion**: Tab takes it before the first turn.
- **Guided by default**, so he can ask: which kind of joke (`ask_human`), a file (`request_file`), whether to retire an original.

## 7. In a browser and on the desktop

The terminal is one of his three faces; all three are views of the kit's [chat controller](../advanced/custom-hosts.md#the-chat-controller), and none of the graphical ones is the kit's: they're his own, as [ADR-026](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-026-graphical-interface.md) has it.

- **`web/server.ts`** (about 290 lines): his jokebook installed on the first start, a controller with `panels: "state"`, an HTTP server on `127.0.0.1` with a token in the URL, the state by server-sent events, the person's actions by `POST`, one window at a time, uploads for `request_file`, files added to his chest through the `sources` extension's `api` (`chat.api("sources").addSource`), the language switched with the controller's `setLanguage()` and kept in his home's `settings.json`, and signing in from the page when there's no Claude key.
- **`web/index.html`**: one page, no dependencies or build: the conversation drawn block by block (only what changed), tool calls folded with a spinner while they run, the approvals, choices and plans as dialogs, a menu of commands on `/` (his, his extensions' and the chat's, from the state's `commandDetails`), quick actions and the language at the top, files dropped or attached to fill his chest, the mode with what each one means, earlier conversations and extensions in side panels, light and dark, laid out for a phone.
- **`desktop/main.mjs`**: Electron around that page. The main process starts the web host with a token that never leaves it, keeps everything in the app's data folder, and opens links in the browser; nothing else, so the app is exactly his web. Packaged with `electron-builder` and `asarUnpack` only: the kit [runs packaged](../advanced/custom-hosts.md#packaging-an-electron-app) by itself.

`captain.ts` is what the three share: his texts, prompt, crew and spec, and `createCaptain({ workspace, home })`, his config and session opener for wherever he keeps his things. The opener builds the spec each time it opens a session, in the language of that moment, so switching languages renames him too.

## 8. The logbook and the chest

`logbook/` is his [knowledge base](../capabilities/knowledge-base.md), reached only through the `knowledge_*` tools; `treasure/` is his chest of [originals](../capabilities/knowledge-base.md#sources-originals-kept-as-obtained). His prompt and commands put them to work:

- `/captain-whiskers:learn` ingests the chest: `list_sources` and `knowledge_index` to see what the logbook lacks, `extract_text` on the PPTX (speaker notes included) and the DOCX, one `knowledge_create` call for a summary and the concepts it feeds, `knowledge_log`.
- A fresh joke becomes a `joke` page, with the parrot's score when the jokebook is installed; `/jokebook:best-jokes` ranks them and files the ranking as a synthesis.
- `/captain-whiskers:stock-the-chest` downloads two pages (`download_to_sources`, kept as markdown too) and asks for a joke book (`request_file`).
- "That document was the wrong one" ends in `retire_source`, with approval, and then `knowledge_retire` for its summary, with another.
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
- "How do I resume a conversation?" or "What does Shift+Tab do?": he answers from the `help` skill; "What mode are you in?" or "What can you do?", from `about_me`.
- Ctrl+O to fold the tool calls; drag and right-click to copy; `?` for the shortcuts.
- "From now on, always end your answers with: Yo-ho, landlubber!", then `/exit` and `npm start`: a `preference` page, and the new session follows it.
- `/exit`, then `npm start -- --continue`.
