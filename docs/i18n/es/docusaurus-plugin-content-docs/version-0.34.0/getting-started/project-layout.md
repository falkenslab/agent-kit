---
sidebar_position: 4
title: Estructura del proyecto
description: Una estructura recomendada para el repositorio de un agente y para el workspace en el que trabaja.
---

# Estructura del proyecto

El kit no impone una estructura, pero todo lo que hace es relativo a unas pocas carpetas que eliges tú. Esta es la estructura que usan el propio ejemplo del kit y sus consumidores reales.

## El repositorio del agente {#the-agents-repository}

```text
my-agent/
├── package.json          "type": "module", depends on @falkenslab/agent-kit
├── tsconfig.json
├── .env                  ANTHROPIC_API_KEY=…, if you use one (git-ignored)
├── .gitignore            .env, .run/, node_modules/
├── agent.ts              the entry point: spec, config, chat
├── prompts/              system prompt templates (createPromptLoader)
│   └── system.md
├── plugin/               the agent's own skills and slash commands
│   ├── .claude-plugin/
│   │   └── plugin.json   { "name": "my-agent" }
│   ├── skills/
│   │   └── some-skill/SKILL.md
│   └── commands/
│       └── some-command.md
└── .run/                 one folder per run (git-ignored)
    ├── history.jsonl     the ↑/↓ history, shared by every run
    └── 2026-09-29T10-15-00-000Z/
        ├── session.log         what the terminal showed, as plain text
        ├── transcript.jsonl    every tool call and result, secrets redacted
        ├── conversation.jsonl  the SDK's transcript of the conversation
        ├── subagents/          each subagent's transcript
        └── session.json        the SDK session's id, to resume it
```

## El workspace en el que trabaja el agente {#the-workspace-the-agent-works-in}

`projectDir` es el directorio de trabajo de la sesión. Cuando el agente tiene notas o fuentes, suelen vivir dentro de él:

```text
workspace/                projectDir: the session's cwd
├── .claude/              the project's own skills, commands and settings (loaded by default)
│   ├── skills/
│   └── commands/
├── CLAUDE.md             project instructions (loaded by default)
├── .mcp.json             extra MCP servers for this workspace (optional)
├── knowledge/            knowledge({ dir }): the agent's notes (through the knowledge_* tools)
│   ├── index.md
│   ├── log.md
│   └── …
└── sources/              sources({ dir }): originals (read-only for the agent; .agent-kit/ holds the kit's bookkeeping)
```

Para un agente con un único propósito, el workspace puede ser el propio repositorio del agente (`projectDir: __dirname`, como en Captain Whiskers). Un agente que sirve a muchos workspaces (uno por curso, por cliente…) toma el workspace de su configuración y guarda su propio código en otra parte.

## Dónde se configura cada pieza {#where-each-piece-is-configured}

| Carpeta | Se define con | Página |
| --- | --- | --- |
| `projectDir` | `BaseSessionConfig.projectDir` | [Configuración de la sesión](../core-concepts/session-config.md) |
| La base de conocimiento, las fuentes, la memoria | la opción `dir` de su extensión, en `AgentSpec.extensions` (`knowledge({ dir })`, `sources({ dir })`, `memory({ dir })`) | [Extensiones](../extensions/overview.md), [Base de conocimiento](../capabilities/knowledge-base.md) |
| Carpetas de plugins | `AgentSpec.pluginRoots()` | [Skills y plugins](../capabilities/skills-and-plugins.md) |
| La carpeta de ejecuciones | la opción `runsDir` del chat | [Ejecuciones y reanudación](../sessions/runs-and-resuming.md) |
| La carpeta de la ejecución | se pasa a tu abridor de sesión (`run.dir`) | [Opciones de la sesión](../core-concepts/session-options.md) |
| El fichero del historial | la opción `historyPath` del chat | [Chat Ink](../terminal-ui/ink-chat.md) |

:::note Resuelve las carpetas a rutas absolutas
El kit compara rutas cuando aplica el [ámbito de ficheros](../security/file-scope.md). Pasa rutas absolutas (`path.resolve(...)`, o `path.join(__dirname, ...)`) para que un directorio de trabajo distinto nunca cambie lo que el agente puede alcanzar.
:::
