---
sidebar_position: 8
title: Awareness
description: La extensión awareness - el agente sabe quién es y qué es en este momento (su modo, sus extensiones y sus herramientas, sus subagentes, sus comandos, su contexto) y cómo se usa su chat, y la persona puede preguntárselo.
---

# Awareness

La [extensión](../extensions/overview.md) `awareness` le da al agente consciencia de sí mismo. Sin ella, el modelo solo sabe lo que dice tu prompt: si le preguntan "¿en qué modo estás?", "¿qué sabes hacer?" o "¿cómo vuelvo a la conversación de ayer?", improvisa, y la sesión cambia sin que lo sepa (Shift+Tab, el modo plan, una extensión desactivada). Con ella:

- **Una sección "Who you are"** en el prompt del sistema: el nombre del agente, su versión y qué es, la versión de agent-kit sobre la que funciona, y dónde buscar el resto.
- **`about_me`**, una herramienta de solo lectura que dice qué es el agente en este momento, leído de la sesión en cada llamada: su modo y los modos a los que puede cambiar la persona, sus extensiones con sus herramientas y lo que le permite hacer cada una (sus [capacidades](../extensions/overview.md#capabilities)) y las que están desactivadas (con el motivo), sus subagentes, sus herramientas integradas, los comandos que puede escribir la persona, y lo lleno que está su contexto. Con `part: "guide"`, la guía propia del agente sobre su dominio (la opción `guide` de la extensión). También lista las extensiones que esperan a que la persona inicie sesión, con cómo hacerlo (`/extensions sign-in <nombre>`), y los servidores del `.mcp.json` del proyecto que se dejaron fuera porque los duplica una extensión.
- **La skill `help`** (`awareness:help`), cómo se usa el chat del kit, igual para todos los agentes: los modos y cómo cambiarlos, las aprobaciones y las preguntas, las teclas, los slash commands, reanudar, `--continue` y `--language`.
- **`extensions_catalog` y la skill `extensions`**, cuando el agente tiene carpeta de extensiones (`extensionDirs`): el agente [aconseja sobre extensiones](../extensions/installing.md#the-agents-own-suggestions), lo instalado y lo que ofrecen sus catálogos, y sugiere una que encaje con una petición. De solo lectura: nunca instala nada.

Al modelo se le indica que responda a partir de ellas, nunca de memoria, y que lo diga cuando algo no esté cubierto en lugar de inventarse una opción.

## Activarla {#turning-it-on}

```ts
const { version } = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8")) as { version: string };

const spec: AgentSpec<Config> = {
  // …
  identity: { name: "padawan", version, description: "an agent that takes a Moodle course as a student" },
  extensions: [awareness({ guide: path.join(__dirname, "guide.md") }), knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") })],
};
```

Necesita [`identity`](../core-concepts/agent-spec.md#identity-and-the-guide) en la especificación: sin ella está apagada, "needs `identity` in the spec". Proporciona `self-awareness`. Solo `name` es obligatorio. `guide`, la ruta absoluta de un fichero markdown, es su única opción, y es opcional; sin ella, `about_me` dice que el agente no tiene guía propia.

Escribe la guía en inglés, como el resto de lo que lee el modelo, y pensando en las preguntas de la persona: los comandos propios del agente, su configuración (variables de entorno, ficheros de configuración), sus carpetas, lo que sabe hacer. Deja fuera el chat (lo cubre la skill `help` y cambia con el kit) y lo que cambia durante una sesión (lo dice `about_me`). La guía se lee cada vez que se pide, así que el agente no necesita herramientas de ficheros.

## Qué responde `about_me` {#what-about_me-answers}

Una página markdown que lee el modelo, en inglés, como esta:

```md
# You, right now

You are Captain Whiskers 0.18.0: a retired pirate cat who tells jokes, on agent-kit 0.18.0.

## Mode

You are in **plan** mode now. The person can switch it with Shift+Tab to guided or interactive.

## Extensions

- **knowledge**: The logbook… Tools: knowledge_create, knowledge_read, …
- **memory** is off: it needs a folder (`dir`).

## Subagents you can delegate to
…
## Context

12% of the context window used (25k of 200k tokens).
```

Las herramientas, los comandos y el contexto salen de la sesión en marcha: antes de que haya empezado, las herramientas de una extensión aparecen como `mcp__<server>__*` y no hay comandos. Los `helpLines` de cada extensión (lo que dice de sí misma aquí, como los comandos de la memoria) van debajo de ella.

En modo plan, `about_me` se deja pasar como cualquier herramienta de solo lectura. En modo interactivo pregunta antes, como todas las herramientas.

## Los datos de la sesión, para cualquier extensión {#the-sessions-facts-for-any-extension}

`about_me` lee `ExtensionContext.session()`, que reciben todas las extensiones: los datos del núcleo sobre la sesión (`SessionFacts`), leídos de nuevo en cada llamada, nunca los datos de otra extensión. Llámalo desde una herramienta, no desde `contribute()`, que se ejecuta antes de que exista la sesión:

```ts
async contribute({ session }) {
  return { mcpServers: { dice: createDiceServer(async () => (await session()).mode) } };
}
```

La parte viva (las herramientas, las skills, los comandos y el contexto de la sesión) le llega a través de `runQuery()`, que encuentra la vista en las opciones que devolvió `buildSessionOptions()`, incluida una copia hecha con spread. Un host que construye sus propias opciones deja esas partes vacías.

## Costes {#costs}

La sección del prompt ocupa unos 200 tokens y la definición de `about_me` unos 150, en cada llamada; la skill no cuesta nada hasta que se carga.
