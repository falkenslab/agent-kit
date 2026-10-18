---
sidebar_position: 4
title: Asistente (wizard)
description: runWizard() - hacer preguntas antes de que arranque el agente, en Ink o con prompts planos.
---

# Asistente (wizard)

`runWizard(steps, options?)` hace una lista de preguntas y se resuelve con todas las respuestas por nombre de paso: la configuración que un agente necesita antes de arrancar (un workspace, un modo, credenciales). En un TTY es un formulario de Ink; sin él (o con `plain: true`), las mismas preguntas con [`@inquirer/prompts`](https://www.npmjs.com/package/@inquirer/prompts).

```ts
import { runWizard, isExitPromptError } from "@falkenslab/agent-kit";

try {
  const answers = await runWizard(
    [
      { type: "input", name: "course", message: "Course URL", validate: (v) => (v.startsWith("https://") ? true : "Use an https:// URL") },
      { type: "input", name: "user", message: "Username" },
      { type: "password", name: "password", message: "Password" },
      {
        type: "select",
        name: "mode",
        message: "How closely do you want to supervise?",
        choices: [
          { name: "Guided", value: "guided" },
          { name: "Step by step", value: "interactive" },
          { name: "Autonomous", value: "autonomous" },
        ],
        default: "guided",
      },
      {
        type: "confirm",
        name: "remember",
        message: (answers) => `Remember these settings for ${answers.course}?`,
        default: true,
      },
    ],
    { title: "Course assistant setup" },
  );
  console.log(answers.mode); // "guided"
} catch (error) {
  if (isExitPromptError(error)) process.exit(0); // Ctrl+C
  throw error;
}
```

## Pasos {#steps}

Cada paso tiene `name` (la clave de la respuesta), `message` y, opcionalmente, `when(answers)` para saltarlo. `message`, `choices` y `default` pueden ser valores o funciones de las respuestas dadas hasta el momento.

| Tipo | Campos | Respuesta |
| --- | --- | --- |
| `input` | `default?`, `validate?(value, answers)` que devuelve `true` o un mensaje de error | `string` |
| `password` | `validate?` | `string` (oculta mientras se escribe) |
| `select` | `choices: { name, value }[]`, `default?` (un valor) | el `value` elegido |
| `confirm` | `default?` (`true` si se omite) | `boolean` |

```ts
{
  type: "input",
  name: "proxy",
  message: "Proxy URL",
  when: (answers) => answers.network === "corporate",
}
```

## Opciones {#options}

| Opción | Descripción |
| --- | --- |
| `title` | Se imprime encima de la primera pregunta. |
| `plain` | Prompts planos incluso en un TTY. |
| `theme`, `language` | Consulta [Temas](themes.md) e [Idiomas](../sessions/languages.md). La opción enfocada de un `select` usa el color `selection` del tema. |

Las preguntas respondidas se quedan en pantalla como `✔ <message> <answer>`, con las contraseñas ocultas. Ctrl+C rechaza con un error llamado `ExitPromptError`, en las dos variantes, así que `isExitPromptError()` cubre ambas.
