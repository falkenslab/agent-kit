---
sidebar_position: 4
title: Elecciones y planes
description: ask_human para elegir entre opciones, y present_plan para salir del modo plan con la aprobación de la persona.
---

# Elecciones y planes

Dos herramientas permiten al agente preguntar algo a la persona en un panel y obtener la respuesta dentro del mismo turno, en lugar de terminar su turno con una pregunta escrita. Ambas están en el servidor `approvals`, así que existen en todos los modos salvo `autonomous`, y el modo plan las deja pasar.

## `ask_human`: elegir entre opciones {#ask_human-a-choice-between-options}

```text
ask_human({
  question: "How long should topic 3 take?",
  options: ["One session", "Two sessions", "Two sessions and a lab"],
  multiple: false,
})
```

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `question` | `string` | La pregunta, en el idioma en que responde el agente. |
| `options` | `string[]` | De 2 a 8 opciones cortas. El panel añade una última, "Other", para escribir una respuesta propia. |
| `multiple` | `boolean` | Si se pueden elegir varias (por defecto: una). |

El modelo recibe lo que eligió la persona ("The person chose: Two sessions."), sus propias palabras si las escribió, o que no respondió. En el chat de Ink:

```text
╭──────────────────────────────────────────────────────────╮
│ The agent asks                                           │
│ How long should topic 3 take?                            │
│                                                          │
│ ❯ 1. One session                                         │
│   2. Two sessions                                        │
│   3. Two sessions and a lab                              │
│   Other (type your own answer)                           │
│ ↑/↓ choose · Enter to send                               │
╰──────────────────────────────────────────────────────────╯
```

Con `multiple`, Espacio marca opciones y Enter envía. Elegir "Other" convierte el panel en un campo de texto. En el chat sencillo, las opciones se imprimen numeradas y la respuesta son los números (`1,3`) o palabras propias. El [fichero de respuesta](response-file.md) admite la misma respuesta.

Úsala cuando el agente necesite una decisión para seguir: qué enfoque, cuál de varios elementos, cuánto. Una línea en el prompt del sistema ayuda: "when you need the user to choose, use ask_human rather than asking in your reply".

## `present_plan`: salir del modo plan con aprobación {#present_plan-leaving-plan-mode-with-approval}

En [modo plan](../core-concepts/modes.md#plan) el agente solo puede leer y planificar. Cuando el plan está listo, `present_plan` lo muestra, representado como markdown, con tres opciones:

| Opción | Qué ocurre |
| --- | --- |
| Run it | El modo plan termina, se vuelve al modo en que estaba la sesión antes (como hace `/plan`), la barra de estado lo muestra y el agente ejecuta el plan de inmediato, en el mismo turno. |
| Keep planning | La persona puede decir qué debería cambiar; el modo se mantiene, y el agente revisa el plan y lo presenta de nuevo. |
| Cancel | El modo se mantiene, y el agente se detiene y pregunta qué quiere en su lugar. |

```text
present_plan({ plan: "## Plan\n\n1. Read the syllabus\n2. Draft the three sessions\n3. …" })
```

Fuera del modo plan se rechaza ("you aren't in it, so just go ahead"), y una sesión que no puede estar en modo plan (autónoma) no la tiene. Shift+Tab y `/plan` siguen funcionando: `present_plan` es la salida guiada, para que la persona no necesite conocerlos.

Esta es la salida del modo plan propia del kit: no se usa el `ExitPlanMode` del SDK (consulta el ADR-023 en el repositorio).

## Cuando la puerta de pasos está activa {#when-the-step-gate-is-on}

En modo `interactive` la [puerta de pasos](step-gate.md) pregunta antes de cada llamada a una herramienta, salvo las que ya preguntan a la persona por sí mismas: `ask_human`, `present_plan`, las herramientas de aprobación y de intervención manual, `request_file` y `retire_source`, y la lista de tareas (`TodoWrite`). Preguntar para preguntar sería ruido.

## Preguntar desde tu propio código {#asking-from-your-own-code}

`askForChoice(runDir, prompt, options, multiple?)` pregunta de la misma forma desde tus propias herramientas, haciendo competir el puerto de interacción y el fichero de respuesta, y se resuelve con `{ chosen, other? }`:

```ts
import { askForChoice } from "@falkenslab/agent-kit";

const { chosen, other } = await askForChoice(runDir, { title: "Export", lines: ["Which format?"] }, ["PDF", "Word", "Markdown"]);
```

`askForText(runDir, prompt)` pide texto libre (se respetan mayúsculas y minúsculas), como hace `request_file` para una ruta. Los hosts con su propia interfaz implementan los opcionales `askChoice` y `askText` del [puerto de interacción](interaction-port.md); sin ellos, el kit pregunta a través de `askDecision`.
