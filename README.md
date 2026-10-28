<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit/main/docs/static/img/logo.svg" alt="agent-kit logo: three blue building blocks and a coral one being set in place" width="112"/>

# agent-kit

**Build an AI agent on Claude that asks before it acts, remembers, and chats like Claude Code.**<br/>
You write what your agent knows and does; the kit brings oversight, safety, memory and the interface.

[![npm](https://img.shields.io/npm/v/@falkenslab/agent-kit?color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/agent-kit)
![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![Claude Agent SDK](https://img.shields.io/badge/Claude-Agent%20SDK-d97757?logo=anthropic&logoColor=white)
![TypeScript](https://img.shields.io/badge/types-included-3178c6?logo=typescript&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](LICENSE)

**[📖 Documentation](https://falkenslab.github.io/agent-kit/)** · [📖 Documentación en español](https://falkenslab.github.io/agent-kit/es/)

</div>

agent-kit is a foundation for building AI agents on top of the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). It isn't an agent itself: it solves once what every agent needs (levels of oversight, approvals, safe limits, memory across sessions, extensions, and a terminal chat as good as Claude Code's), so each agent writes only what belongs to its own domain: what it knows how to do, with which tools, and how it talks. A teacher's assistant for Moodle and a pirate cat who tells jokes are built the same way.

## ✨ Why agent-kit

- 🎚️ **You choose how much it acts alone.** Autonomous, guided (it asks before what others will see or can't be undone), step by step, or a plan mode where it only reads and plans; switch among them in the same conversation.
- ✋ **It asks a person, and the kit makes sure.** Approvals, choices, a file, a sign-in by hand; an installed extension's tool that changes things waits for a yes whatever the model decided, and answers can last for the session or for good.
- 🧠 **It remembers.** A knowledge base that grows with every session, the original documents it learns from kept untouched, a memory of the person, and every conversation to pick up again with `--continue` or `/resume`.
- 🛡️ **It stays within limits.** Only its own folders, never protected files, subagents that can't slip past the main agent's limits, secrets hidden from the logs, remote servers allowed, asked about or denied.
- 🧩 **It grows with extensions.** Claude Code plugins with MCP servers, skills and commands, installed from a marketplace or a folder, with their own options, sign-in and a catalog in the chat; no Git needed.
- 🌐 **It speaks your language.** Its interface in English, Spanish, French or German, and it answers in that language unless you write in another.
- 🖥️ **A terminal chat like Claude Code's, or none at all.** Full screen, live markdown, folded tool calls, panels, history, themes; or the same agent inside a desktop app or a web page with its own interface.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later and a Claude account. In a project with `"type": "module"` in its `package.json`:

```bash
npm install @falkenslab/agent-kit tsx
```

Save this as `agent.ts`: the only part that's your agent's is the spec at the top.

```ts
import path from "node:path";
import { buildSessionOptions, ensureClaudeAuth, runChatInk, type AgentSpec, type BaseSessionConfig } from "@falkenslab/agent-kit";

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You are a pirate cat who tells jokes. Always answer in character.",
  buildMcpServers: () => ({}), // its own MCP servers, if any
  pluginRoots: () => [], // folders with skills and commands
  buildSubagents: () => undefined, // subagents, if it delegates to any
};

await ensureClaudeAuth(); // offers to sign in with your Claude account, on Anthropic's page, if it isn't
const config: BaseSessionConfig = { mode: "guided", projectDir: process.cwd() };

// Each run gets a folder under .run/ (keep it out of git): its log, transcript and conversation.
await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: { title: "My agent" },
  mode: config.mode, // Shift+Tab cycles through guided, step by step and plan
  fullscreen: true,
});
```

Run it with `npx tsx agent.ts`: a full-screen chat opens, in your system's language, and the agent asks before anything it shouldn't do alone. The [tutorial](https://falkenslab.github.io/agent-kit/docs/getting-started/first-agent) takes it from there.

## 🧪 A taste of the code

Give it a memory and a folder of sources, with the kit's own extensions:

```ts
import { knowledge, memory, sources } from "@falkenslab/agent-kit";

const spec: AgentSpec<BaseSessionConfig> = {
  // …
  extensions: [sources({ dir: "sources" }), knowledge({ dir: "knowledge" }), memory({ dir: "memory" })],
};
```

Let it install extensions from your marketplace, and keep its data from leaving the computer without asking:

```ts
const config: BaseSessionConfig = {
  mode: "guided",
  projectDir: process.cwd(),
  extensionDirs: { agent: path.join(os.homedir(), ".my-agent", "extensions") },
  officialMarketplace: "falkenslab/agent-extensions",
  remoteServers: "ask",
};
```

Make a tool always wait for the person's yes, on every call:

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  // …
  extensionGate: { confirmTools: { canva: ["create-design", "publish-design"] } },
};
```

## 📸 See it at work

[Captain Whiskers](./examples/captain-whiskers), the kit's example agent: a retired pirate cat who tells jokes in your language, with a crew of subagents (one looks for new jokes on the web, one rates them, one tells the time), a logbook and an extension of his own. He runs in the terminal, in a browser and as a Windows app.

<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit/main/docs/assets/captain-whiskers.png" alt="Captain Whiskers in Windows Terminal: his logo with the mode and the agent-kit version at the top, his crew at work in the middle, a task list under the spinner, and the framed prompt and status bar at the bottom" width="760"/>

</div>

See [everything he can do](https://falkenslab.github.io/agent-kit/docs/examples/captain-whiskers#what-he-can-do), with screenshots. For a real one, [miyagi](https://github.com/falkenslab/miyagi) is an assistant for Moodle teachers: it grades, answers the forum, builds content and sums up how the class is going, asking before publishing anything students will see. Oversight, memory, safety and the chat come from the kit; miyagi brings what it knows about Moodle.

## 🧰 What's inside

| Area | For example |
| --- | --- |
| 🎚️ Modes and gates | Autonomous, guided, step by step and plan; the guided gate for extensions' tools, the plan gate, the step gate |
| ✋ Human in the loop | Approvals, choices, free text, files, manual steps, MCP elicitation forms, a response file for hosts without a keyboard |
| 🧠 Memory | A knowledge base (an LLM wiki), sources kept as obtained, a memory of the person, runs resumed with `--continue` and `/resume` |
| 🧩 Extensions | Claude Code plugins with MCP servers (local, npm, remote with OAuth), skills, commands and subagents; scopes, a lock, workspace trust, options, marketplaces and a catalog |
| 🛡️ Security | A file scope gate, denied paths, subagent gates, a remote-servers gate, isolation from the runner's own Claude Code, redacted transcripts |
| 🤖 Subagents | Declared types only, in the foreground, without Bash for the main agent |
| 🖥️ Interfaces | A full-screen Ink chat, a plain readline chat, a progress view, a wizard, themes; a chat controller for desktop apps and web pages |
| 🌐 Languages | English, Spanish, French and German, for the interface, the replies and the extensions' servers |

Every export, with what it takes and what it gives, is in the [API reference](https://falkenslab.github.io/agent-kit/docs/api).

## 📚 Documentation

- **[Getting started](https://falkenslab.github.io/agent-kit/docs/getting-started/installation)**: installation and a first agent, step by step.
- **[Modes](https://falkenslab.github.io/agent-kit/docs/core-concepts/modes)** and **[human in the loop](https://falkenslab.github.io/agent-kit/docs/human-in-the-loop/overview)**: how much the agent does alone, and how it asks.
- **[Extensions](https://falkenslab.github.io/agent-kit/docs/extensions/overview)**: installing, writing and publishing them.
- **[Security](https://falkenslab.github.io/agent-kit/docs/security/overview)**: every guardrail, and what the kit doesn't protect.
- **[The terminal chat](https://falkenslab.github.io/agent-kit/docs/terminal-ui/ink-chat)**: its keys, panels, options and themes.
- **[Captain Whiskers](https://falkenslab.github.io/agent-kit/docs/examples/captain-whiskers)**: the example agent, piece by piece.

## 🛠️ Developing

The design decisions, and the SDK behaviors checked by hand behind several safeguards, are in [`.minispec/`](./.minispec/README.md).

| Command | What it does |
| --- | --- |
| `npm run build` | Builds the kit into `dist/` |
| `npm run typecheck` | Checks the types without building |
| `npm run lint` | Checks the code style |
| `npm test` | Runs all the tests (one file: `npx tsx --test test/tui/promptErrors.test.ts`) |
| `npm run docs:install` | Installs the documentation site's dependencies (once) |
| `npm run docs:start` | Serves the documentation site locally, reloading on changes |
| `npm run docs:build` | Builds the documentation site (fails on broken links) |

To try changes to the kit in an agent without publishing them, point its `package.json` to a local clone (`"file:../agent-kit"`) and run `npm run build` after each change.

Working on the kit with Claude Code goes through Falken's Lab's own skills (commit, verify, update-docs, release, sync-issues, and the house style for READMEs, sites and Markdown), from the [falkenslab/falkenslab-plugins](https://github.com/falkenslab/falkenslab-plugins) marketplace. Install them once, for all of Falken's Lab's repositories:

```bash
claude plugin marketplace add falkenslab/falkenslab-plugins
claude plugin install falkenslab-dev@falkenslab-plugins
claude plugin install falkenslab-style@falkenslab-plugins
```

<details>
<summary>What each plugin brings, and what stays in this repository</summary>

- 🔧 **falkenslab-dev**: `commit`, `verify`, `update-docs`, `release`, `sync-issues`, `upgrade-deps` and `add-tool`.
- 🎨 **falkenslab-style**: `falkenslab-docs`, `falkenslab-site-style`, `falkenslab-terminal-screenshots` and `markdown-writing`.

Inside Claude Code, the same with `/plugin marketplace add falkenslab/falkenslab-plugins` and `/plugin install falkenslab-dev@falkenslab-plugins`; `/plugin marketplace update falkenslab-plugins` brings their latest version. This repository keeps only the skills that are agent-kit's own, in `.claude/skills/` (`add-export`, the MiniSpec ones and `upgrade-sdk`), and what its release adds to the general one is in [`CLAUDE.md`](./CLAUDE.md#releasing).

</details>

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
