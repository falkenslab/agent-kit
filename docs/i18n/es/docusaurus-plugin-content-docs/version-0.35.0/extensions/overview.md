---
sidebar_position: 1
title: Visión general
description: Qué es una extensión (las propias del kit, las de tu agente y las instaladas desde una carpeta, un repositorio o un marketplace), qué ve el agente de ellas, las capacidades y dónde se ejecuta cada tipo.
---

# Extensiones

Un agente es el núcleo del kit (el chat, los modos y sus puertas, los subagentes, la transcripción, los idiomas) más las **extensiones** con las que se ejecuta. Una extensión es un [plugin de Claude Code](https://code.claude.com/docs/en/plugins) (un manifiesto, skills, comandos, subagentes) más lo que aporta a una sesión: sus herramientas, lo que el modelo necesita saber de ellas, cuáles de sus herramientas solo leen, cómo las muestra el chat y los ajustes que pide.

Hay dos tipos, que una sesión resuelve de la misma forma:

- **Internas**, distribuidas en un paquete: las cuatro del kit (`awareness`, `sources`, `knowledge`, `memory`) y las que tu agente escriba en su propio código. Se ejecutan en el proceso del agente, con las piezas internas del kit a mano. El agente las activa en su spec: consulta [Las propias del kit](the-kits-own.md).
- **Instaladas**: un plugin de Claude Code tal cual, desde una carpeta, un repositorio git o un marketplace, en el agente (para todos sus proyectos) o en un proyecto. Cualquier agente basado en el kit puede usarla, y también Claude Code. Sus herramientas son su propio servidor MCP, que el kit ejecuta en un proceso aparte con un entorno limpio. La persona las instala, configura, activa y desactiva.

## Por dónde seguir {#where-to-go}

| Si quieres | Lee |
| --- | --- |
| 🧩 Activar la base de conocimiento, las fuentes, la memoria o awareness del kit, o escribir una extensión en el código de tu agente | [Las propias del kit](the-kits-own.md) |
| 📦 Dejar que los usuarios de tu agente instalen extensiones: ámbitos, el comando, marketplaces, el catálogo en el chat | [Instalación y catálogo](installing.md) |
| ⚙️ Entender cómo se piden, se guardan y se cambian los ajustes de una extensión | [Configuración](configuring.md) |
| 🗂️ Compartir un proyecto cuyas extensiones viajan con él, y confiar en ellas en cada ordenador | [Workspaces](workspaces.md) |
| 🛠️ Construir una extensión instalable, paso a paso | [Escribir una](writing.md) |
| 🧪 Probarla mientras la construyes, validarla y versionarla | [Desarrollo y pruebas](developing.md) |
| 🚀 Publicar un marketplace, su catálogo y su página | [Publicar un marketplace](publishing.md) |
| 📖 Consultar un campo de un manifiesto, una opción o un lock | [Referencia del manifiesto](reference.md) |

## Lo que ve el agente {#what-the-agent-sees}

Con cualquier extensión activa, el prompt del sistema recibe una sección **Extensions** después del prompt y la identidad propios del agente, y luego la sección propia de cada extensión interna:

```text
## Extensions
What you can do besides your own tools comes from these extensions; their sections below say how to use them.
- **sources**: The sources folder: originals kept as obtained, … Provides: sources.
- **knowledge**: Built-in knowledge base workflows (an LLM wiki) … Provides: knowledge-base.
- **weather**: The weather in your city, for an agent that plans with you … 
```

Una extensión desactivada también aparece, con el motivo ("it needs a folder (`dir`)", "it requires memory, which no enabled extension provides", "it needs city (Your city) set"). Con la extensión [awareness](../capabilities/awareness.md), `about_me` le dice lo mismo al agente en cualquier momento, para que pueda contárselo a la persona. Las reglas propias de una extensión instalada llegan al modelo a través de las `instructions` de su servidor; sus procedimientos, a través de sus skills.

## Capacidades {#capabilities}

El manifiesto de una extensión dice qué **proporciona** y qué **requiere**, en forma de capacidades: nombres, no otras extensiones.

- Una extensión que requiere una capacidad que ninguna extensión activada proporciona se queda fuera, igual que cualquiera que dependiera a su vez de ella.
- Una **skill** también puede requerir capacidades, en su frontmatter; solo se ofrece cuando están presentes:

```markdown
---
name: rank-jokes
description: Rank the jokes in the knowledge base by their score…
requires: knowledge-base
---
```

Valen `requires: a`, `requires: [a, b]` y una lista YAML. Una skill que se queda fuera así no se le lista al modelo y la herramienta `Skill` la rechaza. Como el `skillOverrides` del SDK no llega a las skills de los plugins, dejar una fuera convierte las `skills` de la sesión en una lista (las skills de los plugins y las del proyecto) aunque el spec diga `"all"`.

Las capacidades del kit son `self-awareness`, `sources`, `knowledge-base` y `person-memory`; un agente nombra las suyas (las capacidades de aula de miyagi, por ejemplo), y dos extensiones pueden proporcionar la misma.

Una capacidad también puede **describirse para la persona**, en el campo `capabilities` del manifiesto: lo que el agente hace bien con la extensión, formado por las skills que dicen cómo y las herramientas que lo hacen, con una etiqueta y una descripción por idioma. "Grading with rubrics" de moodle-teacher es su skill `grading` con `get_rubric`, `get_submissions` y `grade_submission`. El id de una capacidad descrita cuenta como proporcionado, así que `requires` funciona igual; `/extensions`, `about_me`, `extension info` y el catálogo las muestran como "lo que tu agente puede hacer". Dale un id neutro (`lms-grading`, no `moodle-grading`): así las skills de un agente dependen de lo que se puede hacer, y otra extensión (la de Google Classroom) puede proporcionarla mañana. Cómo escribirlas está en [Escribir una](writing.md#4-agent-kits-data). Una capacidad que necesita un programa que este ordenador no tiene ([requisitos](writing.md#programs-it-needs)) no se proporciona, sus skills se quedan fuera y el agente dice qué instalar.

## Dónde se ejecutan {#where-they-run}

- **Las extensiones internas** se ejecutan en el proceso del agente: las del kit se revisan con él, y las propias de un agente son código de su autor.
- **Las extensiones instaladas** se ejecutan aparte, porque su código puede venir de cualquiera. Su servidor es un proceso de Node separado, arrancado a través del lanzador del kit, que elimina todas las variables de entorno salvo las del sistema y las que declara el manifiesto (el SDK combina el `env` de un servidor con el del propio agente, así que pasar solo `env` no ocultaría las credenciales del agente). Sus ficheros se comprueban contra un hash antes de cada sesión; los de un workspace necesitan la confianza de la persona ([Workspaces](workspaces.md)); sus hooks nunca se ejecutan; sus subagentes no reciben `Bash`. Sus herramientas pasan por las mismas puertas que cualquier otra: la aprobación en modo interactivo, el [modo plan](../core-concepts/modes.md#plan), la transcripción.

Las decisiones detrás de todo esto están en el [ADR-025](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-025-extensions.md).
