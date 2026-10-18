---
sidebar_position: 3
title: Puertas de subagentes
description: Los tres hooks que hacen segura la delegación - tipo, Bash y primer plano - y el comportamiento del SDK que hay detrás.
---

# Puertas de subagentes

Cuando un spec declara subagentes, la sesión recibe la herramienta `Agent`, `Bash` cuando un subagente lo lista (o no tiene `tools`, y por tanto hereda todas las herramientas de la sesión), y tres hooks `PreToolUse`, las puertas (gates). Funcionan juntas: si quitas una, se puede rodear otra.

## Puerta de tipo {#type-gate}

**Solo se pueden lanzar los tipos de subagente que has declarado.**

El SDK tiene un tipo de subagente integrado, `general-purpose`, que se puede lanzar diga lo que diga tu mapa `agents`, y que hereda **todas** las herramientas de la sesión, Bash incluido, en lugar de la lista reducida que declaran tus subagentes. Sin esta puerta, un modelo podría delegar en él para llegar a Bash. Ocurrió en un agente real: el modelo delegó el borrado de un fichero en un agente `general-purpose` espontáneo.

La puerta deniega cualquier llamada a `Agent` cuyo `subagent_type` no esté en `allowedSubagentTypes`:

> Delegation is only available for "joke-finder"/"joke-critic" in this session, not "general-purpose" - do the task directly with your own tools instead of spawning another agent for it.

## Puerta de Bash {#bash-gate}

**Bash es solo para subagentes.**

El SDK se niega a lanzar un subagente cuyas herramientas declaradas no estén todas entre las herramientas de la sesión, así que `Bash` tiene que estar en la sesión para que un subagente lo use; el kit lo añade solo en ese caso. Una vez ahí, el agente principal podría usarlo directamente, y las herramientas integradas se saltan `canUseTool`. La puerta deniega `Bash` cuando la llamada viene del hilo principal: la entrada del hook lleva `agent_id` solo en las llamadas hechas dentro de un subagente.

> Bash is only available to dedicated subagents, not the main agent directly — use the Agent tool to delegate to one of them instead.

Esto solo se sostiene junto con la puerta de tipo: dentro de un subagente `general-purpose` también hay `agent_id`.

## Puerta de primer plano {#foreground-gate}

**Los subagentes siempre se ejecutan en primer plano.**

La herramienta `Agent` ejecuta los subagentes en segundo plano por defecto. El trabajo de un subagente en segundo plano llega como mensajes de tarea que el chat no espera: el turno termina antes de que el subagente haga nada, y su resultado se pierde sin aviso. Poner `background: false` en la definición no lo cambia. La puerta reescribe la entrada de la llamada a `run_in_background: false` para cada subagente permitido, antes de que se ejecute.

## Usarlas tú mismo {#using-them-yourself}

Los tres hooks se exportan para una sesión montada a mano:

```ts
import { createSubagentBashGate, createSubagentForegroundGate, createSubagentTypeGate } from "@falkenslab/agent-kit";

const allowed = ["joke-finder", "joke-critic"];

hooks: {
  PreToolUse: [
    { hooks: [createSubagentTypeGate(allowed)] },
    { hooks: [createSubagentBashGate()] },
    { hooks: [createSubagentForegroundGate(allowed)] },
  ],
},
```

Registra las tres juntas.
