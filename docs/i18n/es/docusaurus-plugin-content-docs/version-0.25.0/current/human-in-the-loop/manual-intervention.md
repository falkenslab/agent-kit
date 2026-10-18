---
sidebar_position: 5
title: Intervención manual
description: Deja que el agente se detenga hasta que una persona haga algo a mano, como iniciar sesión.
---

# Intervención manual

Hay pasos que un agente no puede o no debe dar: iniciar sesión con credenciales que no tiene, resolver un captcha, aprobar un aviso de doble factor en un móvil. El punto de control de intervención manual le permite detenerse hasta que una persona lo haya hecho a mano en la interfaz que maneja el agente (una ventana del navegador, por ejemplo), y después continuar.

## Activarla {#opting-in}

No hay textos predeterminados: qué cuenta como intervención manual depende por completo de tu dominio. Definir `manualInterventionTexts` en el spec es lo que registra la herramienta (fuera del modo `autonomous`):

```ts
const spec: AgentSpec<Config> = {
  // …
  manualInterventionTexts: {
    toolDescription:
      "Call this when you need to log in and can't: no credentials, a failed login, a captcha or a second factor. " +
      "A person will log in by hand in the browser window you're driving. Call it, wait, then check the page.",
    confirmedMessage: "The person says they're done. Reload the page and check you're logged in before continuing.",
    checkpointTitle: "Log in by hand",
    checkpointLines: [
      "The agent needs you to log in in the browser window it opened.",
      "Log in there, then confirm here.",
    ],
    checkpointQuestion: "Press Enter once you've logged in: ",
  },
};
```

| Campo | Se muestra a | Propósito |
| --- | --- | --- |
| `toolDescription` | el modelo | Cuándo llamar a `request_manual_login`. |
| `confirmedMessage` | el modelo | Lo que devuelve la herramienta cuando la persona confirma. |
| `checkpointTitle`, `checkpointLines` | la persona | El título y los detalles del punto de control. |
| `checkpointQuestion` | la persona | La pregunta en el terminal sencillo (opcional). |

La herramienta es `mcp__manualLogin__request_manual_login`, sin parámetros.

## Qué ve la persona {#what-the-person-sees}

En el chat de Ink, un panel con tu título y tus líneas y una única opción, **1. Done, continue**. En el terminal sencillo, las líneas y tu pregunta. El fichero de respuesta también lo responde: cualquier contenido cuenta como hecho.

## Construirla tú mismo {#building-it-yourself}

```ts
import { createManualLoginServer } from "@falkenslab/agent-kit";

mcpServers: { manualLogin: createManualLoginServer(runDir, texts) },
```

Y desde tu propio código, `askForManualIntervention(runDir, { title, lines, question })` espera de la misma forma.
