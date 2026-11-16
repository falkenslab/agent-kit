---
sidebar_position: 7
title: Memoria de la persona
description: La extensión memory - lo que el agente aprende sobre la persona para la que trabaja, guardado en todos sus proyectos en una carpeta propia, solo a partir de lo que dice la persona.
---

# Memoria de la persona

La [extensión](../extensions/overview.md) `memory` le da al agente una memoria de la persona para la que trabaja: quién es (su nombre, su rol) y cómo quiere que se hagan las cosas (sus correcciones, cómo le gustan las respuestas). Dura entre sesiones y en **todos sus proyectos**, algo que la [base de conocimiento](knowledge-base.md) de un proyecto no puede hacer: padawan aprendiendo cómo estudia un alumno, curso tras curso; miyagi aprendiendo el estilo de un profesor.

## Activarla {#turning-it-on}

```ts
import os from "node:os";
import path from "node:path";
import { memory, type AgentSpec } from "@falkenslab/agent-kit";

const spec: AgentSpec<Config> = {
  // …
  extensions: [memory({ dir: path.join(os.homedir(), ".miyagi", "memory") })], // with others: [sources(…), knowledge(…), memory(…)]
};
```

- `dir` es una carpeta propia del agente, **fuera de cualquier proyecto**: una ruta, o una función de la configuración de la sesión que devuelva una. Sin ella, la extensión queda fuera ("needs a folder (`dir`)") y el agente puede explicar por qué.
- **No la compartas nunca entre agentes.** Agentes distintos trabajan para personas distintas, o para la misma persona en roles distintos, y lo que le va bien a uno estropea a otro. Una memoria compartida sería además una vía para que una instrucción colada en un agente llegase a los demás.
- Una memoria por agente y por usuario del ordenador. Si el agente trabaja con varias cuentas y quiere una memoria para cada una, pone la cuenta en la ruta (`~/.miyagi/memory/<account>`).

## Lo que ve el agente {#what-the-agent-sees}

Su sección del prompt lista lo que recuerda, una línea por entrada, empezando por la guardada más recientemente (hasta 50; a partir de ahí, la línea dice cuántas quedan fuera y `recall` las da todas):

```text
## Your memory of the person
You keep a memory of the person you work for, across all their projects: …
- no-fish-puns (feedback): Dislikes puns about fish; avoid fish-themed jokes
- preferred-name-fran (user): Wants to be called Fran
```

Después, sus reglas:

- Aplicar lo que recuerda sin que se lo pidan.
- Guardar cuando la persona le corrige, dice cómo le gusta que se hagan las cosas o le cuenta algo de sí misma que volverá a importar, y decirlo en pocas palabras ("Lo recordaré"). No pregunta antes. Si ya hay una entrada que lo cubre, actualiza esa entrada en lugar de añadir otra.
- Guardar solo lo que se refiere a la persona trabaje donde trabaje. Cómo hacer el trabajo de este proyecto va en el proyecto (las [preferencias](knowledge-base.md#the-persons-preferences) de la base de conocimiento), y lo que solo necesita esta tarea no va a ninguna parte.
- Escribir las entradas en el idioma en que responde.

## Las herramientas {#the-tools}

Tres, con nombres que reflejan cómo funciona la memoria (el modelo las ve como `mcp__memory__recall`, etcétera):

| Herramienta | Qué hace |
| --- | --- |
| `recall` | Con `name`, esa entrada completa; sin él, todas las entradas (nombre, tipo y descripción). Solo lectura. |
| `remember` | Crea una entrada o cambia una, con la `quote` de la persona. Una nueva lleva `name` (kebab-case), `type` (`user` o `feedback`), `description` (una línea) y `body` (para `feedback`, la regla, por qué y cómo aplicarla). Para cambiar una, su `name` y solo lo que cambia: `type`, `description` o `body` completos, o `old_string` y `new_string` para una frase suya, en su descripción o en su cuerpo. |
| `forget` | Olvida una entrada. |

Cambiar una entrada no necesita un `recall` previo cuando el modelo sabe qué cambiar: una descripción nueva, por ejemplo, que ve en el prompt. `old_string` y `new_string` funcionan como el `Edit` de Claude Code (y tienen sus nombres, que los modelos conocen): `old_string` debe aparecer en la entrada (descripción y cuerpo juntos) exactamente una vez, o no cambia nada y la herramienta dice por qué (sin números de línea, que se desplazan y que el modelo tendría que leer antes).

**Solo lo que dijo la persona.** `remember` comprueba que su `quote` aparece en un mensaje que la persona escribió en esta conversación, sin tener en cuenta mayúsculas, espacios ni comillas. Si no, no cambia nada, ni en una entrada nueva ni en una existente, y le dice al modelo por qué. La extensión escucha los mensajes de la persona con un hook `UserPromptSubmit` (y, en una ejecución reanudada, lee los anteriores de la conversación de la ejecución). Un documento, una página web o el resultado de una herramienta que diga "recuerda que la persona quiere…" no puede meter nada en la memoria, lo formule como lo formule.

Las herramientas de ficheros nunca llegan a la carpeta (la denegación remite a sus herramientas), y en [modo plan](../core-concepts/modes.md#plan) solo funciona `recall`.

## Comandos para la persona {#commands-for-the-person}

| Comando | Qué hace |
| --- | --- |
| `/memory:list` | Muestra todo lo que el agente recuerda sobre ella, por tipo. |
| `/memory:forget <entry>` | Olvida una entrada, por nombre o por descripción. |

Decirlo con palabras normales también funciona ("olvida que no me gustan los juegos de palabras"). Con la extensión [awareness](awareness.md), el agente puede contarle a la persona que la memoria existe y cómo verla.

## En disco {#on-disk}

Un fichero markdown por entrada, `<dir>/<name>.md`, como la auto-memoria de Claude Code (que el kit mantiene desactivada, porque pertenece al runner y va por carpeta):

```markdown
---
name: no-fish-puns
description: Dislikes puns about fish; avoid fish-themed jokes
type: feedback
updated: 2026-10-07T13:15:05.678Z
---

Rule: never tell jokes or puns about fish to this person. Why: they said "I can't stand puns about fish." Apply: …
```

Borrar un fichero olvida esa entrada; borrar la carpeta lo olvida todo.
