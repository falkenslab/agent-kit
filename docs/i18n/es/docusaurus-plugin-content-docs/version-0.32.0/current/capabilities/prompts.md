---
sidebar_position: 6
title: Prompts
description: Guarda los prompts del sistema como ficheros con createPromptLoader(), y escribe prompts que funcionen bien con el kit.
---

# Prompts

## Ficheros de prompt con `createPromptLoader()` {#prompt-files-with-createpromptloader}

Un prompt del sistema de más de unas pocas líneas es más fácil de leer, revisar y comparar como fichero markdown. `createPromptLoader(rootDir)` devuelve una función que carga un fichero relativo a `rootDir` y sustituye los marcadores `{{name}}`:

```md title="prompts/system.md"
You are Scout, a research assistant for {{team}}.

## How you work

- Answer in short paragraphs, with sources.
- Keep your notes in the knowledge base.
```

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPromptLoader } from "@falkenslab/agent-kit";

const here = path.dirname(fileURLToPath(import.meta.url));
const loadPrompt = createPromptLoader(path.join(here, "prompts"));

const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => loadPrompt("system.md", { team: config.team }),
  // …
};
```

- Un marcador sin valor lanza un error (`Prompt "system.md": missing variable "team"`), así que una errata falla al arrancar, no en silencio dentro del contexto del modelo.
- Los marcadores son `{{word}}` (letras, dígitos, guion bajo). Las variables de más se ignoran.
- Se recortan los espacios en blanco del final.
- Los ficheros se leen de forma síncrona en cada llamada: es barato, y los cambios surten efecto en la siguiente sesión sin reiniciar tu código.

Compón prompts a partir de partes:

```ts
buildSystemPrompt: (config) =>
  [
    loadPrompt("role.md", { team: config.team }),
    config.mode === "autonomous" ? loadPrompt("autonomous.md") : loadPrompt("supervised.md"),
    loadPrompt("style.md"),
  ].join("\n\n"),
```

## Lo que el kit añade a tu prompt {#what-the-kit-adds-to-your-prompt}

No repitas esto en tu prompt; se añade por ti:

- con [extensiones](../extensions/overview.md), su lista y la sección de cada una (la de la [base de conocimiento](knowledge-base.md#the-rules-the-agent-follows), la de las fuentes);
- la línea del [idioma de respuesta](../sessions/languages.md).

La descripción de la herramienta de aprobación (modo guiado) ya le dice al modelo cuándo llamarla; tu prompt puede decir qué cuenta como "publicar" en tu dominio, o fijarlo en [`humanApprovalTexts`](../core-concepts/agent-spec.md#humanapprovaltexts).

## Escribir prompts que funcionen bien {#writing-prompts-that-work-well}

- **Di quién es el agente y para qué sirve** en las primeras líneas.
- **Describe el flujo de trabajo de sus herramientas**, no solo que existen: "antes de contar un chiste que haya traído el buscador, pásaselo al crítico".
- **Nombra a los subagentes** y di cuándo usar cada uno.
- **Pide una lista de tareas en los trabajos largos.** Toda sesión tiene `TodoWrite`; el modelo la usa por su cuenta en trabajos de varios pasos, pero una línea como "para cualquier cosa de más de tres pasos, mantén una lista de tareas" lo hace fiable, y la persona ve el progreso encima del prompt.
- **No confíes en el prompt para la seguridad.** Un prompt que dice "no borres nunca ficheros" es un deseo; el [ámbito de ficheros](../security/file-scope.md), `disallowedTools` y los [hooks](../advanced/hooks.md) son garantías.
- **Escríbelo en inglés** (o en el idioma en que debe responder el agente). Un prompt en otro idioma arrastra las respuestas hacia ese idioma aunque el kit pida otro. Consulta [Idiomas](../sessions/languages.md#limits).
- **Mantenlo corto.** Cada token del prompt se envía en cada llamada; pon los detalles que rara vez hacen falta en una skill, que el modelo carga solo cuando viene al caso.
