---
sidebar_position: 2
title: Skills y plugins
description: Dale a un agente skills y slash commands mediante plugins locales y la carpeta .claude del proyecto, y elige qué skills ofrece.
---

# Skills y plugins

Una **skill** es una carpeta con un `SKILL.md`: instrucciones que el modelo carga cuando decide que vienen al caso (ve el nombre y la descripción de cada skill, y llama a la herramienta `Skill` para cargar una). Un **slash command** es un fichero markdown que la persona lanza escribiendo `/nombre`: su cuerpo se envía como mensaje. Ambas son funciones de Claude Code que el SDK trae consigo; el kit las conecta.

## Un plugin local {#a-local-plugin}

Empaqueta las skills y los comandos propios de un agente como un plugin:

```text
plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── pirate-joke/
│   │   └── SKILL.md
│   └── miau/
│       └── SKILL.md
└── commands/
    ├── joke.md
    └── fresh-joke.md
```

```json title="plugin/.claude-plugin/plugin.json"
{
  "name": "captain-whiskers",
  "description": "Captain Whiskers' own skills and slash commands."
}
```

```md title="plugin/skills/pirate-joke/SKILL.md"
---
name: pirate-joke
description: How to build a pirate or sailor pun before telling it.
---

# Building a pirate joke

1. Start from a sailor word with a double meaning (anchor, mutiny, compass…).
2. Force the pun against something from the human's everyday life.
3. Finish with a pirate exclamation ("Arrr!", "Yo ho ho!").
```

```md title="plugin/commands/joke.md"
---
description: Ask the captain to tell a pirate joke.
---

Tell a pirate joke following the "pirate-joke" skill.
```

Cárgalo desde la especificación:

```ts
pluginRoots: () => [path.join(__dirname, "plugin")],
```

Las skills y los comandos de un plugin llevan como espacio de nombres el nombre del plugin: la skill es `captain-whiskers:pirate-joke` y el comando, `/captain-whiskers:joke`. Un comando puede recibir argumentos: `$ARGUMENTS` en su cuerpo se sustituye por lo que venga detrás del comando.

Los plugins se cargan siempre que `pluginRoots()` devuelva al menos una carpeta, incluso sin herramientas de ficheros, y la sesión recibe la herramienta `Skill`.

## Las skills y los comandos del propio proyecto {#the-projects-own-skills-and-commands}

Con la fuente de configuración `"project"` (la predeterminada), el SDK también encuentra `<projectDir>/.claude/skills/` y `<projectDir>/.claude/commands/`. Ahí es donde un workspace guarda las skills que le son propias, igual que haría una persona con Claude Code. Pon `settingSources: []` para ignorarlas.

## Elegir qué skills ofrece el agente {#choosing-which-skills-the-agent-offers}

Por defecto, una sesión ofrece todas las skills que encuentra (`skills: "all"`): las de los plugins, las del proyecto y las del propio SDK, unas veinte (`deep-research`, `dataviz`, `code-review`, `loop`…), incluso con `settingSources: []`. Cada una cuesta contexto en cada llamada (su nombre y su descripción se le listan al modelo), y las skills que no vienen al caso lo distraen.

Ofrece solo las skills de los plugins que carga tu agente, sin nombrarlas:

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  // …
  pluginRoots: () => [path.join(__dirname, "plugin")],
  skills: "plugins", // its own and its extensions'
};
```

O enuméralas por su nombre, para dejar alguna fuera:

```ts
skills: ["captain-whiskers:pirate-joke", "captain-whiskers:miau"],
```

- Los nombres son el `name` de una skill, o `plugin:skill` para las de un plugin, donde `skill` es **la carpeta de la skill** dentro de `skills/`, diga lo que diga el `name` de su frontmatter. Un `SKILL.md` sin frontmatter no se carga.
- Las skills de las extensiones activadas (las de la base de conocimiento, `awareness:help`) se añaden a tu lista automáticamente.
- Es un **filtro de contexto, no un sandbox**: las skills que no están en la lista quedan ocultas para el modelo y la herramienta `Skill` las rechaza, pero sus ficheros siguen en disco.
- **Los slash commands siguen funcionando** aunque no estén en la lista: un comando lo escribe la persona, no lo elige el modelo.

Captain Whiskers pasó de unos 15,7k a 11,4k tokens de entrada por llamada al ofrecer solo sus propias skills y no cargar ninguna configuración (`settingSources: []`). Consulta [Contexto y coste](../sessions/context-and-cost.md).

## Los comandos en el chat {#commands-in-the-chat}

Los chats listan todos los comandos que conoce la sesión para autocompletarlos (Tab después de `/`) y detectan uno mal escrito antes de que llegue al modelo: un `/comando` desconocido muestra "Unknown command" en lugar de enviarse como texto. Los comandos locales del propio chat son `/exit` y `/quit` (configurables), `/copy` (la última respuesta al portapapeles), `/resume` (con una carpeta de ejecuciones) y `/plan` (activa o desactiva el modo plan). Con la extensión [awareness](awareness.md), el propio agente puede explicarlos.

## Escribir buenas skills {#writing-good-skills}

- La **descripción** decide cuándo carga el modelo una skill: di para qué sirve y cuándo aplicarla.
- Mantén cada skill **centrada** en una sola tarea; divide las largas.
- Escribe las skills **en el idioma en que quieres las respuestas, o en inglés**. El texto en otro idioma arrastra las respuestas hacia él (consulta [Idiomas](../sessions/languages.md#limits)).
- Una skill puede hacer referencia a ficheros junto a su `SKILL.md`; el modelo los lee cuando los necesita (con herramientas de ficheros).
