---
sidebar_position: 4
title: Modos
description: autonomous, guided, interactive y plan; qué cambia cada uno y cómo cambiar de modo durante una sesión.
---

# Modos

El modo es cuánto participa una persona en el bucle. Es lo único que `buildSessionOptions()` necesita para decidir qué herramientas y hooks de persona en el bucle recibe una sesión.

| Modo | El agente… | Herramientas y hooks que añade el kit |
| --- | --- | --- |
| `autonomous` | actúa por su cuenta; no se le pregunta nada a nadie | ninguno: ni herramienta de aprobación, ni puerta de pasos, ni intervención manual |
| `guided` | explora libremente, pero pregunta antes de cualquier cosa visible para otros o difícil de deshacer | `request_human_approval`; `request_manual_login` si la spec define `manualInterventionTexts`; la puerta de pasos, registrada pero inactiva |
| `interactive` | pregunta antes de **cada** llamada a herramienta | lo mismo que el guiado, con la puerta de pasos activa |
| `plan` | solo lee y planifica; no se cambia nada hasta que la persona sale del modo | lo mismo que el guiado, con la puerta del plan activa |

## autonomous {#autonomous}

Para trabajos que nadie vigila: ejecuciones programadas, procesamiento por lotes, agentes cuyas herramientas no pueden hacer daño. El agente no tiene ningún canal para preguntar a una persona, y es así a propósito. Por eso una herramienta de una extensión instalada que cambia cosas se deniega, salvo que el agente diga que se ejecuten ([`extensionGate.autonomous`](agent-spec.md#extensiongate)).

```ts
const config: BaseSessionConfig = { mode: "autonomous", projectDir };
```

## guided {#guided}

El agente recibe una herramienta `request_human_approval` cuya descripción le indica que la llame justo antes de publicar algo visible o difícil de deshacer, con un resumen de lo que está a punto de hacer. La persona responde **Sí**, **No** o **Parar** en un panel (o en el prompt, o a través del [fichero de respuesta](../human-in-the-loop/response-file.md)); la herramienta devuelve al modelo el texto de aprobado o de rechazado.

Escribe los textos de la herramienta para tu dominio con [`humanApprovalTexts`](agent-spec.md#humanapprovaltexts): lo que significa "publicar" para un agente de Moodle no es lo que significa para un agente de Git.

:::warning Una salvaguarda a nivel de prompt
El modo guiado depende de que el modelo llame a la herramienta en el momento adecuado. Es el equilibrio correcto para "no publiques sin preguntar", no un límite infranqueable. Para límites infranqueables, usa `disallowedTools`, el ámbito de ficheros o tus propios [hooks](../advanced/hooks.md).
:::

Las extensiones instaladas son la excepción: el propio kit pregunta antes de una de sus herramientas que no se sabe que solo lee, con respuestas que la persona puede hacer durar (esta sesión, siempre, nunca), y un `request_human_approval` aprobado cubre las llamadas que siguen hasta su siguiente mensaje. Mira [Las herramientas de las extensiones que cambian cosas](../human-in-the-loop/approvals.md#extensions-tools-that-change-things).

## interactive {#interactive}

Cada llamada a herramienta se detiene en la puerta (gate) de pasos, un hook `PreToolUse` que muestra la llamada como la etiqueta el chat, el nombre de la herramienta y sus parámetros en una línea, y espera una respuesta:

- **Sí** (`y`, Intro): la llamada sigue adelante.
- **No** (`n`): la llamada se deniega; al modelo se le dice que la persona la rechazó y puede probar otra cosa.
- **Parar** (`q`): la llamada se deniega y el turno termina (`continue: false`).

Útil para ver trabajar a un agente nuevo, paso a paso, o para ejecutarlo donde cada acción importa.

## plan {#plan}

Piensa antes de construir: el agente lee, investiga y presenta un plan, y nada cambia hasta que la persona sale del modo plan y el agente lleva el plan a cabo. El agente presenta el plan con [`present_plan`](../human-in-the-loop/choices-and-plans.md#present_plan-leaving-plan-mode-with-approval), donde la persona lo ejecuta, sigue planificando o lo cancela; Shift+Tab y `/plan` lo abandonan a mano. La puerta del plan, un hook `PreToolUse` activo solo en este modo, decide sobre cada llamada a herramienta, incluidas las de los subagentes:

- **Pasan:** `Read`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `Skill`, `Agent`, `TodoWrite`, las herramientas de aprobación y de intervención manual, las herramientas de fecha y hora, `list_sources`, `extract_text`, las herramientas de lectura de la base de conocimiento (`knowledge_index`, `knowledge_search`, `knowledge_read`, `knowledge_check`) y las herramientas MCP que el agente declara de solo lectura.
- **Escriben:** `Write`/`Edit` solo en los ficheros de plan del agente, si declara alguno. Sin ellos, el agente presenta el plan en su respuesta.
- **Denegadas:** todo lo demás: otras escrituras, `Bash`, las herramientas que añaden a la carpeta de fuentes o retiran de ella, y cada herramienta MCP que el agente no avale (una extensión instalada avala las suyas, en su manifiesto o mediante el `readOnlyHint` de sus servidores: consulta [Herramientas de solo lectura](../extensions/writing.md#read-only-tools)), así que una herramienta olvidada no puede cambiar nada. La denegación le dice al modelo que está en modo plan y que la persona lo abandona cuando quiere que el plan se lleve a cabo.

El agente declara ambas cosas en [`planMode`](agent-spec.md#planmode):

```ts
planMode: {
  // The plan of each activity, in drafts/<slug>/plan.md (it must also be writable: in extraWritableDirs).
  isPlanFile: (filePath, config) => path.basename(filePath) === "plan.md" && path.dirname(path.dirname(filePath)) === config.draftsDir,
  // The browser tools that only look.
  isReadOnlyTool: (toolName) => ["mcp__playwright__browser_snapshot", "mcp__playwright__browser_take_screenshot"].includes(toolName),
},
```

El prompt del sistema no cambia con el modo, así que el kit le cuenta el cambio al modelo: el siguiente mensaje después de entrar en el modo plan o de salir de él empieza con una nota breve que lo dice. `createInputQueue({ modeControl })` la añade (los chats lo hacen); un host con su propia cola antepone él mismo `modeControl.takeNotice?.()`. Una conversación reanudada no muestra la nota como palabras de la persona.

Una sesión también puede empezar en modo plan (`mode: "plan"`), y entonces cambia de modo como una guiada.

:::info Por qué no el modo plan del SDK
El SDK tiene su propio `permissionMode: "plan"`, pero hace que el modelo llame a una herramienta `ExitPlanMode` que no está entre las herramientas del kit, y no permite que se escriba un fichero de plan. La puerta del plan del kit es un hook como las demás salvaguardas: su denegación no se puede sortear con palabras.
:::

## Cambiar de modo durante una sesión {#switching-modes-during-a-session}

Una sesión iniciada en `guided`, `interactive` o `plan` puede cambiar entre los tres mientras se ejecuta: tienen las mismas herramientas, y la puerta de pasos y la puerta del plan están registradas en todos ellos, cada una activa solo en su propio modo. Una sesión `autonomous` no puede cambiar: no tiene herramienta de aprobación, y una herramienta no puede aparecer en mitad de una sesión.

`buildSessionOptions()` devuelve el `ModeControl` de la sesión:

```ts
const { options, modeControl } = await buildSessionOptions(config, runDir, spec);

modeControl.mode; // "guided"
modeControl.switchable; // ["guided", "interactive", "plan"]
modeControl.set("interactive"); // true: the step gate asks from the next tool call on
modeControl.set("autonomous"); // false: not allowed
```

En el chat Ink, **Shift+Tab** recorre `modeControl.switchable` y la barra de estado muestra el modo. Con un abridor de sesión (`runChatInk((run) => buildSessionOptions(...))`), el chat toma el control de modo del resultado del abridor; con opciones fijas, pásalo como la opción `modeControl`.

```ts
await runChatInk(options, { mode: config.mode, modeControl });
```

Los dos chats aceptan también **`/plan`**: cambia al modo plan y, si se vuelve a escribir, regresa al modo en el que estaba la sesión antes (guiado, si empezó en modo plan). En una sesión autónoma solo dice que no se puede cambiar el modo. Un host con su propia interfaz hace lo mismo con `togglePlanMode(modeControl)`, que devuelve el nuevo modo, o `null` cuando no se puede llegar al modo plan:

```ts
import { togglePlanMode } from "@falkenslab/agent-kit";

togglePlanMode(modeControl); // "plan"
togglePlanMode(modeControl); // back to "interactive", if that's where it was
```

El prompt del sistema conserva el modo con el que se construyó: si tu prompt dice cosas distintas según el modo, limita esa diferencia a comportamientos que las herramientas ya imponen. Solo se le cuenta al modelo un cambio hacia el modo plan o desde él (consulta [plan](#plan)).

## Elegir un modo al arrancar {#choosing-a-mode-at-startup}

Un patrón habitual es una variable de entorno o un flag de la línea de comandos:

```ts
const modes: Mode[] = ["autonomous", "guided", "interactive", "plan"];
const mode = modes.find((m) => m === process.env.MY_AGENT_MODE) ?? "guided";
```

O una pregunta en el [asistente](../terminal-ui/wizard.md):

```ts
const { mode } = await runWizard([
  {
    type: "select",
    name: "mode",
    message: "How closely do you want to supervise?",
    choices: [
      { name: "Guided: ask before publishing", value: "guided" },
      { name: "Step by step: ask before every action", value: "interactive" },
      { name: "Plan: only read and plan first", value: "plan" },
      { name: "Autonomous: don't ask", value: "autonomous" },
    ],
    default: "guided",
  },
]);
```
