---
sidebar_position: 1
title: Chat Ink
description: runChatInk() - el chat de terminal al estilo de Claude Code - con todas sus opciones, atajos y comportamientos.
---

# Chat Ink

`runChatInk()` es un chat de terminal completo construido con [Ink](https://github.com/vadimdemedes/ink), inspirado en la CLI de Claude Code: la respuesta llega en streaming con su markdown renderizado, las llamadas a herramientas aparecen una a una con sus resultados, los puntos de control son paneles y una barra de estado muestra el modo, los turnos, los tokens y el contexto.

```ts
function runChatInk(options: Options | SessionOpener, tuiOptions?: InkChatOptions): Promise<void>;
```

Se resuelve cuando el chat termina (un comando de salida, o Ctrl+C / Ctrl+D con el prompt inactivo), tras cerrar la sesión. Sin TTY, o con `plain: true`, ejecuta el [chat plano](plain-chat.md) con las mismas opciones.

## Dos formas de arrancarlo {#two-ways-to-start-it}

**Con un abridor de sesión y una carpeta de ejecuciones** (lo recomendado): cada ejecución tiene su propia carpeta, su conversación se guarda ahí y se puede reanudar con `--continue` o `/resume`.

```ts
await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
});
```

El abridor recibe la carpeta de la ejecución que debe usar (una nueva, la última con `--continue`, o la elegida en `/resume`) y devuelve o bien `Options` o bien el resultado completo de `buildSessionOptions()`, del que el chat recoge `modeControl`, `toolLabels` y `extensions`.

**Con opciones fijas**: una sola sesión, los logs donde tú digas y sin reanudación.

```ts
const { options, modeControl } = await buildSessionOptions(config, runDir, spec);
await runChatInk(options, { modeControl, sessionLogPath: path.join(runDir, "session.log") });
```

## Opciones {#options}

### Sesión y ficheros {#session-and-files}

| Opción | Tipo | Por defecto | Descripción |
| --- | --- | --- | --- |
| `runsDir` | `string` | | La carpeta de ejecuciones, con un abridor de sesión. Consulta [Ejecuciones y reanudación](../sessions/runs-and-resuming.md). |
| `sessionLogPath` | `string` | | Con opciones fijas: dónde replicar lo que muestra la terminal. Con `runsDir` se usa en su lugar el `session.log` de cada ejecución. |
| `historyPath` | `string` | | El fichero del historial de ↑/↓ (líneas JSON), que se conserva entre ejecuciones. Sin él, el historial dura una sesión. |
| `historyLimit` | `number` | `100` | Entradas que se conservan en el historial. |
| `initialPrompt` | `string` | | Se envía como primer turno antes de que la persona escriba nada (se registra en el log, no se muestra). Para un agente que deba actuar al arrancar. Se omite al reanudar una conversación. |
| `exitCommands` | `string[]` | `["/exit", "/quit"]` | Líneas que terminan el chat (sin distinguir mayúsculas). |

### Aspecto y textos {#look-and-texts}

| Opción | Tipo | Por defecto | Descripción |
| --- | --- | --- | --- |
| `header` | `HeaderInfo` | | `{ title, fields?, art? }`: fijada arriba en pantalla completa, impresa una vez en otro caso. |
| `welcomeMessage` | `string` | | Se imprime una vez al principio (y se registra en el log). |
| `promptLabel` | `string` | `"> "` | La etiqueta del prompt. Los saltos de línea iniciales solo llegan al log. |
| `agentLabel` | `string` | | La etiqueta antes de la respuesta del agente en el log y en el chat plano, p. ej. `ui.agent("Scout>")`. |
| `fullscreen` | `boolean` | `false` | Ocupar toda la terminal. Consulta [Pantalla completa](#full-screen). |
| `mode` | `Mode` | | Se muestra en la barra de estado cuando no hay control de modo. |
| `theme` | `Partial<Theme>` | | Colores. Consulta [Temas](themes.md). |
| `language` | `string` | | El idioma del kit. Consulta [Idiomas](../sessions/languages.md). |
| `formatAction` | `(toolName, input) => string` | `createFriendlyToolLabel()` | Etiquetas de las llamadas a herramientas. Consulta [Etiquetas de herramientas](tool-labels.md). |
| `openBrowser` | `boolean \| (url) => Promise<boolean>` | `true` | Iniciar sesión en una extensión (`/extensions sign-in`): abre su enlace en el navegador de este ordenador (nunca por SSH ni sin pantalla); `false` solo lo muestra; una función lo abre a tu manera y dice si lo hizo. El enlace se muestra siempre, como enlace de terminal donde el terminal los admite (Windows Terminal, VS Code, iTerm2, WezTerm, Konsole, el de GNOME; `FORCE_HYPERLINK=1` o `0` decide). |
| `cliCommands` | `"all" \| string[]` | ninguno | Los comandos propios de Claude Code en el menú `/` (`/batch`, `/agents`, `/mcp`…), que son para quien desarrolla con Claude Code: ninguno por defecto, `"all"`, o los que se nombren (`["compact", "context"]`). Los comandos del agente, los de sus plugins, sus extensiones, el proyecto, el kit y el chat siempre se ofrecen, y un comando escrito a mano se sigue ejecutando. |
| `toolPhrase` | `(toolName) => ToolPhrase \| undefined` | | Cómo cuentan tus herramientas en un resumen plegado. Consulta [Etiquetas de herramientas](tool-labels.md#folded-summaries). |
| `toolLabels` | `ToolLabels` | | Las etiquetas de las extensiones (el `toolLabels` de `buildSessionOptions()`), antes de `formatAction` y `toolPhrase`, para `Options` simples: con un abridor de sesión, las que este devuelve. Consulta [Etiquetas de herramientas](tool-labels.md#an-extensions-labels). |
| `toolDetail` | `"full" \| "calls" \| "summary"` | `"full"` | Cuánto se muestra de las llamadas a herramientas hasta pulsar Ctrl+O. Consulta [Etiquetas de herramientas](tool-labels.md#how-much-shows). |
| `formatResult` | `ResultFormatter` | | Tu propia línea de resultado por herramienta, o ninguna. Consulta [Etiquetas de herramientas](tool-labels.md#results-for-your-tools). |
| `renderApproval` | `(prompt) => ReactNode` | | Sustituye la vista previa de los paneles de aprobación. Consulta [Paneles de aprobación](#approval-panels). |

### Comportamiento {#behavior}

| Opción | Tipo | Por defecto | Descripción |
| --- | --- | --- | --- |
| `modeControl` | `ModeControl` | | Con opciones fijas: activa el cambio de modo con Shift+Tab y muestra el modo en vivo. |
| `promptSuggestions` | `boolean` | `true` | Muestra en el prompt vacío el siguiente mensaje que predice el modelo (Tab lo acepta). |
| `firstPromptSuggestion` | `string` | | La sugerencia antes del primer turno (el SDK solo sugiere tras un turno). |
| `terminalIntegration` | `boolean` | `true` | El título de la pestaña, el progreso en la barra de tareas y `/copy`. Consulta [Integración con la terminal](#terminal-integration). |
| `plain` | `boolean` | `false` | Usa el chat plano de readline incluso en un TTY. |

## Qué hay en pantalla {#whats-on-screen}

```text
 ▄▀▀▄   Scout
 █  █   mode guided

● Searching the web for "TypeScript 6 release"
  ⎿  Found 8 results (+7 lines)
● Fetching https://devblogs.microsoft.com/typescript/…
  ⎿  TypeScript 6.0 is now available…

● TypeScript 6.0 shipped in March. The main changes are:

  - **Faster builds** through…

✻ Worked for 12s

╭───────────────────────────────────────────────╮
│ you> █                                        │
╰───────────────────────────────────────────────╯
⏵⏵ guided (shift+tab) · 3 turns · 12.4k in (+32.8k cached) / 1.3k out · context 8%
```

- **La respuesta del agente** va tras un `●`, con su markdown renderizado (negrita, cursiva, código en línea, listas, encabezados, citas, bloques de código y tablas como cuadrículas), también mientras llega en streaming.
- **Las llamadas a herramientas** se muestran una a una: `●` y la etiqueta de la herramienta, luego `⎿` y la primera línea de su resultado (en rojo si falló, `…` mientras se ejecuta). Bajo una llamada a un subagente, las llamadas a herramientas del propio subagente (las cinco últimas). **Ctrl+O** pliega cada grupo de llamadas consecutivas en una línea de resumen ("Read 2 files, ran 1 shell command") y las vuelve a desplegar. `toolDetail` muestra menos desde el principio: las llamadas sin resultados, o las líneas de resumen (consulta [Cuánto se muestra](tool-labels.md#how-much-shows)).
- **El spinner** muestra lo que está haciendo el agente, los segundos y `esc to interrupt`; con un subagente trabajando, una segunda línea `↳` muestra su acción.
- **La lista de tareas**: en un trabajo largo el agente mantiene una lista de tareas con la herramienta `TodoWrite` del SDK, y el chat la dibuja bajo el spinner, encima del prompt: `☐` pendiente, `◼` en curso (en negrita, y el spinner dice qué está haciendo), `☑` hecha. Permanece mientras quede alguna tarea, también entre turnos, y desaparece cuando están todas hechas. Las llamadas a `TodoWrite` en sí no aparecen en el historial, y se muestran como mucho ocho tareas (el resto se cuentan). La vista de progreso también la dibuja.
- **Cada turno termina** con `✻ Worked for Ns`.
- **La barra de estado** muestra el modo (`(shift+tab)` si puede cambiar), los turnos, los tokens de entrada nuevos de la sesión con los que se vuelven a leer de la caché aparte (se omiten si la terminal es demasiado estrecha), sus tokens de salida y lo lleno que está la ventana de contexto. Consulta [Contexto y coste](../sessions/context-and-cost.md#watching-it).

## Teclado {#keyboard}

| Teclas | Acción |
| --- | --- |
| Enter | Enviar. Durante un turno la línea se pone en cola (se muestra como `queued: …`) y se envía después. |
| `\` + Enter, Ctrl+J | Nueva línea (mensaje de varias líneas). |
| Tab | Completar un `/command` o un `@file`, o aceptar la sugerencia. |
| ↑ / ↓ | Historial. Con el prompt vacío, ↑ recupera primero la última línea en cola para editarla. |
| Ctrl+R | Buscar hacia atrás en el historial; Ctrl+R otra vez para coincidencias más antiguas, Enter la acepta, Esc cancela. |
| Ctrl+W, Ctrl+K, Ctrl+U | Borrar una palabra hacia atrás, hasta el final de la línea, la línea entera. |
| Ctrl+← / Ctrl+→, Inicio / Fin, Ctrl+A / Ctrl+E | Moverse por palabras, al principio o al final. |
| Supr, Retroceso | Borrar hacia delante, hacia atrás (un bloque pegado, entero). |
| `?` con el prompt vacío | El panel de atajos. |
| Esc | Interrumpir el turno. |
| Ctrl+C | Interrumpir el turno (o responder Stop a un punto de control); con el prompt inactivo, salir. |
| Shift+Tab | Siguiente modo (guiado → interactivo → plan). |
| Ctrl+O | Plegar o desplegar las llamadas a herramientas (desplegadas: cada llamada con su resultado). |

**Pegar** un bloque de varias líneas lo pliega en un token, `[Pasted text #1 +12 lines]`, que se envía expandido. **`@`** seguido de parte de una ruta sugiere los ficheros del proyecto (Tab completa).

## Comandos locales {#local-commands}

| Comando | Qué hace |
| --- | --- |
| `/exit`, `/quit` | Salir (configurable con `exitCommands`). |
| `/copy` | Copia la última respuesta al portapapeles (OSC 52), con la integración con la terminal activada. |
| `/resume` | Elige una conversación anterior para reanudarla, con una carpeta de ejecuciones. |
| `/extensions` | Con qué se ejecuta la sesión, qué está apagado y por qué, y las [extensiones instaladas](../extensions/installing.md); `/extensions enable <name>` o `disable <name>` activa o desactiva una en la misma sesión cuando se estaba ejecutando al abrirse la sesión, y en otro caso reabre la sesión con la misma conversación (con un abridor de sesión). Consulta [En el chat](../extensions/installing.md#in-the-chat). |
| `/plan` | Cambia al [modo plan](../core-concepts/modes.md#plan), o vuelve al modo anterior; solo se ofrece cuando el modo de la sesión puede cambiar. |

Cualquier otro `/command` se comprueba contra los comandos de la sesión (incluidos los skills y los comandos de plugins): uno desconocido muestra "Unknown command" en lugar de llegar al modelo como texto.

## Pantalla completa {#full-screen}

Con `fullscreen: true` el chat ocupa la pantalla alternativa de la terminal:

- la cabecera queda fijada arriba, y el prompt y la barra de estado abajo;
- el historial se desplaza en su propia vista: Re Pág/Av Pág y la rueda del ratón lo mueven, Ctrl+End o escribir vuelve al final, y la salida que llega mientras estás desplazado hacia arriba no lo mueve (la barra de estado muestra `↓ N more lines (Ctrl+End)`);
- **arrastrar selecciona texto; un clic derecho copia la selección** al portapapeles y la borra, como en Windows Terminal;
- la terminal se limpia cuando termina el chat.

Sin ella el chat va en línea: el historial va al propio scrollback de la terminal, y la cabecera se imprime una vez al principio.

## Paneles de aprobación {#approval-panels}

Los puntos de control son paneles en el chat (consulta [Persona en el bucle](../human-in-the-loop/overview.md)). Sustituye la vista previa (título y líneas) por tu propio renderizado; las opciones se mantienen:

```tsx
import { Box, Text } from "ink";
import type { RenderApproval } from "@falkenslab/agent-kit";

const renderApproval: RenderApproval = (prompt) => (
  <Box flexDirection="column">
    <Text bold color="yellow">{prompt.title}</Text>
    {prompt.lines.map((line, i) => (
      <Text key={i} wrap="truncate-end">{line}</Text>
    ))}
  </Box>
);

await runChatInk(opener, { runsDir, renderApproval });
```

## Integración con la terminal {#terminal-integration}

Activada por defecto (`terminalIntegration: false` la desactiva):

- el **título de la pestaña** es el título de la cabecera, y `✻ <title> — working…` mientras se ejecuta un turno (OSC 0);
- el **botón de la barra de tareas** muestra un progreso indeterminado durante un turno (Windows Terminal, OSC 9;4);
- cuando un turno termina mientras la ventana no tiene el foco, el botón de la barra de tareas se pone amarillo hasta que la ventana recupera el foco (informe de foco);
- **`/copy`** copia la última respuesta (OSC 52).

Las terminales que no entienden estas secuencias las ignoran.

## El log de la sesión {#the-session-log}

Todo lo que imprimiría la consola plana se replica en el log de la sesión: el mensaje de bienvenida, cada línea escrita, las respuestas, las líneas `[action]`, los avisos y los errores, sin colores. La pantalla y el log se dibujan de forma distinta (el log es texto plano), pero cuentan la misma historia.

## Cabecera {#header}

```ts
header: {
  title: "Captain Whiskers",
  fields: { mode: "guided", workspace: "course-2026", "agent-kit": agentKitVersion() },
  art: [
    pc.gray("   ▄▄███▄▄"),
    pc.gray("  ▀▀▀▀▀▀▀▀▀"),
    pc.yellow("    /\\_/\\"),
    pc.yellow("   ( o.█ )"),
    pc.yellow("    > ^ <"),
  ],
},
```

Los `fields` se muestran tras el título, `name value`, en orden; `agentKitVersion()` da la versión del kit en uso, y conviene mostrarla para que una captura de pantalla o un informe de error diga cuál es. `art` se dibuja a la izquierda del título, una cadena por fila, con los colores que quieras. **Usa solo caracteres de una columna** (ASCII, caracteres de caja y de bloque como `▄ ▀ █`): el kit y las terminales miden los emoji de forma distinta, y desplazarían el título.
