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

- pregunta desde la herramienta que la realiza, con [`askForDecision()`](overview.md#asking-from-your-own-code);
- o deniégala en un [hook `PreToolUse`](../advanced/hooks.md) salvo que esté aprobada;
- o ejecuta en modo `interactive`, donde cada llamada pasa por la puerta.

## Construirla tú mismo {#building-it-yourself}

`createHumanApprovalServer(runDir, texts?)` se exporta, para una sesión montada sin `buildSessionOptions()`:

```ts
import { createHumanApprovalServer } from "@falkenslab/agent-kit";

mcpServers: { approvals: createHumanApprovalServer(runDir, myTexts) },
```
