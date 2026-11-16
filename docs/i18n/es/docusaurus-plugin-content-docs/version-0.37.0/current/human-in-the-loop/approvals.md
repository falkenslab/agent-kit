---
sidebar_position: 3
title: Aprobaciones
description: La herramienta request_human_approval del modo guiado, y cómo redactarla para tu dominio.
---

# Aprobaciones

En modo `guided` (e `interactive`) el agente tiene una herramienta, `mcp__approvals__request_human_approval`, para preguntar a una persona antes de hacer algo visible para otros o difícil de deshacer. Recibe un parámetro:

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `summary` | string | Resumen breve de lo que el agente va a enviar o publicar. |

La persona ve un punto de control de decisión titulado **Human confirmation required before publishing**, con el resumen. La herramienta devuelve al modelo uno de dos textos:

- aprobado (`y`, `yes` o Enter): "Approved by the human. You may continue.";
- cualquier otra cosa: "Rejected by the human. Don't proceed with that; ask what to do differently."

## Redactarla para tu dominio {#wording-it-for-your-domain}

La descripción de la herramienta es lo único que le dice al modelo cuándo llamarla. La predeterminada es genérica: "right before an action that publishes something visible to others and is hard to naturally undo… not for browsing, not for reading, not before every intermediate step". Sustitúyela por lo que significa publicar para tu agente:

```ts
const spec: AgentSpec<Config> = {
  // …
  humanApprovalTexts: {
    description:
      "Ask the teacher right before anything students will see or that changes grades: " +
      "posting in a forum, publishing a page or an activity, saving or releasing a grade. " +
      "Not for navigating, reading or drafting.",
    approved: "The teacher approved it. Go ahead and publish it exactly as summarized.",
    rejected: "The teacher rejected it. Don't publish it. Ask what they want changed.",
  },
};
```

`DEFAULT_HUMAN_APPROVAL_TEXTS` se exporta por si solo quieres cambiar uno de ellos:

```ts
humanApprovalTexts: { ...DEFAULT_HUMAN_APPROVAL_TEXTS, description: myDescription },
```

## El modo guiado es cooperativo {#guided-mode-is-cooperative}

El modelo decide cuándo llamar a la herramienta. Funciona bien para "pregunta antes de publicar", con una descripción clara y un prompt que lo refuerce, pero no es un límite estricto: un modelo puede saltárselo. Para una acción que nunca debe ocurrir sin una persona:

- si es una herramienta de una extensión instalada, el kit ya pregunta: mira [más abajo](#extensions-tools-that-change-things);
- pregunta desde la herramienta que la realiza, con [`askForDecision()`](overview.md#asking-from-your-own-code);
- o deniégala en un [hook `PreToolUse`](../advanced/hooks.md) salvo que esté aprobada;
- o ejecuta en modo `interactive`, donde cada llamada pasa por la puerta.

## Las herramientas de las extensiones que cambian cosas {#extensions-tools-that-change-things}

En modo guiado, una herramienta de una extensión instalada que no se sabe que solo lee espera el sí de la persona, haga lo que haga antes el modelo: pregunta el kit, no el modelo. Las de solo lectura son las mismas que deja pasar [el modo plan](../extensions/writing.md#read-only-tools): las `readOnlyTools` del manifiesto o, si no las tiene, las que su servidor marca `readOnlyHint`. La pregunta es un panel de opciones titulado **¿Dejas que `<extensión>` haga esto?**, con la etiqueta de la herramienta en el idioma de la sesión y sus parámetros (en una línea, recortada, cuando la herramienta tiene etiqueta; el panel nunca crece más allá de la pantalla, así que sus respuestas siempre se ven), para las llamadas del agente principal y las de sus subagentes. Sus respuestas:

- **Sí**: esta llamada.
- **Sí, en esta sesión**: esa herramienta no vuelve a preguntar hasta que acabe la sesión.
- **Sí, siempre**: se guarda en el lock de la extensión, así que tampoco pregunta en sesiones posteriores.

A una herramienta que siempre pregunta (abajo) solo se le ofrecen **Sí**, **No** y **No, nunca**: "en esta sesión" y "siempre" aprobarían llamadas que nadie ha visto.
- **No**: se deniega la llamada, y se le dice al modelo que no la reintente sin preguntar. Una respuesta escrita en el panel también es un no, que le llega al modelo como palabras de la persona.
- **No, nunca**: se deniega y se guarda: en sesiones posteriores la herramienta ni siquiera está en la sesión (`disallowedTools`).

**Un lote aprobado.** Justo después de que se apruebe `request_human_approval`, las llamadas que siguen continúan sin preguntar hasta el siguiente mensaje de la persona o la siguiente petición de aprobación, así que una aprobación cubre un lote de trabajo: "publica estas diez notas" es una pregunta, no once.

**Herramientas que siempre preguntan**, en cada llamada e incluso dentro de un lote aprobado: las [`confirmTools`](../extensions/writing.md#tools-that-always-ask) del manifiesto y la lista propia del agente ([`extensionGate`](../core-concepts/agent-spec.md#extensiongate)) o, si el manifiesto no las tiene, las que su servidor marca `destructiveHint`. Ahí va lo que crea, edita o publica en la cuenta de la persona.

**Una pregunta, no dos.** Una herramienta cuyo servidor pregunta él mismo a la persona (elicitación de MCP), listada en las [`serverConfirmTools`](../extensions/writing.md#tools-whose-server-asks-itself) del manifiesto, no recibe además la pregunta del kit: la que contesta la persona es la del servidor.

**La palabra de la persona se mantiene.** `/extensions config <name>` (y `extension config <name>` en el terminal) lista lo que se guarda de una extensión; `confirm=reset` olvida las respuestas, `confirm=off` deja que sus herramientas funcionen sin preguntar (una extensión de confianza) y `confirm=on` vuelve a preguntar. El modelo no puede cambiar nada de esto. Cada respuesta va a la [transcripción](../security/transcript.md).

Los otros modos mantienen sus propias puertas: en `interactive` la puerta paso a paso ya pregunta antes de cada llamada, y `plan` deniega lo que no es de solo lectura. En `autonomous`, donde no se puede preguntar a nadie, esas herramientas se deniegan salvo que el agente diga que se ejecuten (`extensionGate.autonomous`). Con [`remoteServers: "ask"`](../core-concepts/session-config.md), la llamada a un servidor remoto pregunta por adónde van los datos, lecturas incluidas; esta puerta va de lo que cambia cosas, en cualquier servidor.

## Construirla tú mismo {#building-it-yourself}

`createHumanApprovalServer(runDir, texts?)` se exporta, para una sesión montada sin `buildSessionOptions()`:

```ts
import { createHumanApprovalServer } from "@falkenslab/agent-kit";

mcpServers: { approvals: createHumanApprovalServer(runDir, myTexts) },
```
