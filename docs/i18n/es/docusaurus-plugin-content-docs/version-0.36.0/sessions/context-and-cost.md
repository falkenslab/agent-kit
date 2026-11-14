---
sidebar_position: 3
title: Contexto y coste
description: Qué envía cada llamada al modelo, cómo medirlo y cómo reducirlo.
---

# Contexto y coste

Cada llamada al modelo envía el contexto entero: el prompt del sistema (el de la CLI, el tuyo y lo que añade el kit), las definiciones de las herramientas, el listado de skills, los ficheros de memoria y la conversación hasta ese momento. La mayor parte se cachea entre llamadas, pero aun así cuenta para la ventana de contexto y para los límites de uso.

## Qué envía una sesión {#what-a-session-sends}

Medido con Captain Whiskers respondiendo a "hola" (tokens de entrada de una llamada a la API):

| Configuración | Tokens de entrada |
| --- | --- |
| Todas las fuentes de configuración (lo predeterminado en el SDK) | ~16.1k |
| `settingSources: ["project"]` (lo predeterminado en el kit) | ~15.7k |
| `settingSources: []`, solo sus dos skills, sin auto-memoria | ~11.4k |

La mayor parte de la parte fija son las definiciones de las herramientas (unos 6k tokens) y el listado de skills (3.5k con todos los skills encontrados, 0.1k con dos). Los ficheros de memoria (los CLAUDE.md encontrados subiendo por el árbol de directorios) aportan el resto.

Esas cifras son anteriores a las herramientas integradas que el kit añadió después. Hoy la primera llamada de esa misma configuración ocupa unos 21.8k tokens, casi todo definiciones de herramientas. Lo que cuesta cada parte, medido quitándola (tokens de entrada de la primera llamada):

| Parte | Tokens | Desaparece con |
| --- | --- | --- |
| `Agent` (con la lista de subagentes) | 4.1k | sin subagentes |
| `TodoWrite` (la lista de tareas) | 3.4k | `disallowedTools: ["TodoWrite"]` |
| La base de conocimiento: diez herramientas `knowledge_*`, su sección del prompt y sus skills | 3.4k | sin la extensión `knowledge` |
| `Read`, `Glob`, `Grep` (`Grep` solo, 1.4k) | 2.7k | sin la extensión `sources`, ni `extraWritableDirs` ni `extraReadableDirs` |
| Las herramientas de las fuentes | 2.2k | sin la extensión `sources` |
| `Bash` | 1.9k | sin ningún subagente que la incluya (entonces el kit la deja fuera) |
| Las herramientas de aprobación y de preguntas | 1.5k | modo autónomo |
| `WebFetch`, `WebSearch` | 1.4k | `disallowedTools` |
| `Skill` y el listado de skills | 1.1k | sin plugins ni herramientas de ficheros |

Las herramientas MCP del kit (las de la base de conocimiento, las de las fuentes, las de las aprobaciones, las de fechas) solo desaparecen con su funcionalidad: `disallowedTools` las bloquea, pero sus definiciones se siguen enviando (consulta [Comportamientos del SDK](../reference/sdk-behaviors.md#tools-and-permissions)).

## Cómo reducirlo {#making-it-smaller}

1. **Ofrece solo tus skills**: `skills: "plugins"` (los de los plugins que carga el agente), o una lista, `skills: ["my-agent:a", "my-agent:b"]`. Los skills propios del SDK y los que no tienen que ver dejan de listarse. Los comandos con barra siguen funcionando. Consulta [Skills y plugins](../capabilities/skills-and-plugins.md#choosing-which-skills-the-agent-offers).
2. **No cargues ficheros de configuración** cuando tu plugin lo trae todo: `settingSources: []`. Los CLAUDE.md de las carpetas superiores (por ejemplo, las instrucciones para desarrolladores de un repositorio) dejan de enviarse.
3. **Concede solo las herramientas que necesitas**: sin herramientas de ficheros si no hay extensión de fuentes ni una carpeta en `extraWritableDirs`/`extraReadableDirs`, sin `Agent` si no hay subagentes, sin `Bash` salvo que un subagente la incluya. `disallowedTools` quita una herramienta integrada que la configuración recibiría de otro modo; a una herramienta MCP solo la bloquea, y su definición se sigue enviando.
4. **Mantén el prompt corto** y lleva a skills los detalles que rara vez hacen falta, que solo se cargan cuando aplican.
5. **Usa subagentes para el trabajo ruidoso**: las búsquedas y lecturas de páginas de un subagente se quedan en su propio contexto; solo su respuesta llega al principal. Usa un `model` más pequeño para ellos.

## Cómo vigilarlo {#watching-it}

La barra de estado del chat Ink muestra los tokens de la sesión y lo lleno que está la ventana de contexto tras cada turno:

```text
⏵⏵ guided (shift+tab) · 6 turns · 26.6k in (+126.7k cached) / 1.4k out · context 3%
```

- **`context 3%`** es lo que ocupa ahora la conversación. Es la cifra que te dice cuándo se acerca la compactación.
- **`26.6k in`** es la entrada nueva de toda la sesión: la parte fija de la primera llamada más lo que añadió cada llamada.
- **`(+126.7k cached)`** es el contexto que se vuelve a enviar desde la caché, una vez por llamada. Crece rápido porque cada llamada lo envía todo de nuevo, pero no significa que el contexto esté creciendo, y las lecturas de caché cuestan una décima parte de la entrada nueva. En una terminal demasiado estrecha para ello, se omite.

Desde el código:

```ts
const run = runQuery(input, options);
// …after a turn:
const usage = await run.contextUsage(); // { percentage, totalTokens, maxTokens } or null
```

Cada evento `turn-end` lleva el uso acumulado de la sesión (`inputTokens`, que incluye las lecturas y escrituras de caché; `cacheReadTokens`, la parte que se leyó de la caché; `outputTokens`, y un `costUsd` estimado). Consulta [Eventos](../advanced/events.md).

## Conversaciones largas {#long-conversations}

`autoCompactEnabled` está activado por defecto: cuando el contexto se llena, la CLI compacta la conversación en un resumen y sigue. Desactívalo con `buildSessionOptions(config, runDir, spec, { autoCompactEnabled: false })` si prefieres que la sesión falle a perder detalle.
