---
sidebar_position: 2
title: Puerta de pasos
description: El hook PreToolUse del modo interactivo que pregunta antes de cada llamada a una herramienta.
---

# Puerta de pasos

La puerta de pasos (step gate) es un hook `PreToolUse` que detiene cada llamada a una herramienta (las del agente principal y las de sus subagentes) hasta que una persona responde. Es lo que significa el modo `interactive`. Las herramientas que ya preguntan a la persona por sí mismas (`ask_human`, `present_plan`, las herramientas de aprobación y de intervención manual, `request_file`, `retire_source`) y la lista de tareas (`TodoWrite`) pasan sin preguntar antes.

## Cuándo está activa {#when-its-active}

`buildSessionOptions()` la registra en las sesiones `guided` e `interactive` y comprueba el modo actual en cada llamada: mientras el modo es `interactive` pregunta; si no, no da ninguna decisión y la llamada sigue como si no estuviera. Eso es lo que permite a una sesión guiada pasar a interactiva y volver ([Modos](../core-concepts/modes.md#switching-modes-during-a-session)). Una sesión `autonomous` no la tiene.

## Qué pregunta {#what-it-asks}

Un punto de control de decisión titulado **Proposed action**, con el nombre de la herramienta y sus parámetros como JSON formateado:

```text
Proposed action
Tool: WebFetch
Parameters: {
  "url": "https://example.com/news",
  "prompt": "Summarize the headlines"
}
```

## Qué hace cada respuesta {#what-each-answer-does}

| Respuesta | Valores | Efecto |
| --- | --- | --- |
| Sí | `y`, `yes`, Enter (`""`) | La llamada sigue adelante. |
| No | `n`, cualquier otra cosa | La llamada se deniega. Al modelo se le dice "Action rejected by the user in step-by-step mode." y decide qué hacer a continuación. |
| Parar | `q` | La llamada se deniega y el turno se detiene (`continue: false`): "Execution stopped manually by the user." |

Los textos para el modelo están siempre en inglés, sea cual sea el [idioma del kit](../sessions/languages.md); el panel está en el idioma del kit.

## Usarla en tu propia cadena de hooks {#using-it-in-your-own-hook-chain}

`createStepGate(runDir, isActive?)` se exporta para construir tú mismo el mismo hook, por ejemplo en una sesión que montas a mano:

```ts
import { createStepGate } from "@falkenslab/agent-kit";

const stepGate = createStepGate(runDir, () => supervised); // asks only while `supervised` is true

const options: Options = {
  // …
  hooks: { PreToolUse: [{ hooks: [stepGate] }] },
};
```
