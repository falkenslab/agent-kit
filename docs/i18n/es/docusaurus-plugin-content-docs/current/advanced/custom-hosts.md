---
sidebar_position: 3
title: Hosts propios
description: Ejecuta un agente sin terminal - una aplicación Electron, un servidor, un sidecar - con el núcleo del kit.
---

# Hosts propios

El núcleo del kit nunca escribe en el terminal, así que el mismo agente puede ejecutarse dentro de una aplicación de escritorio, un servidor o una página web. La lógica propia del chat (abrir la sesión, las líneas y comandos de la persona, los turnos, `/resume`, `/extensions`, el modo, los puntos de control, el log de la sesión y el historial) vive en un **controlador del chat** sin interfaz: los chats de terminal son vistas de él, y un host tuyo es una más.

## El controlador del chat {#the-chat-controller}

`createChatController()` recibe lo mismo que `runChatInk()`, las opciones o un abridor de sesión, y unos ajustes muy parecidos a las opciones del chat:

```ts
import { buildSessionOptions, createChatController } from "@falkenslab/agent-kit";

const chat = await createChatController((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir, // each run in its folder, resumable
  historyPath: path.join(runsDir, "history.jsonl"),
  panels: "state", // checkpoints become part of the state (see below)
});

chat.subscribe((state) => window.webContents.send("chat:state", state)); // plain data, every change
await chat.start(); // draws the run's earlier conversation, sends the initial prompt
await chat.send("Tell me a joke"); // a line: a command, or a turn (resolves when it ends)
```

**Su estado** (`getState()`, y cada cambio a través de `subscribe()`) son datos planos, iguales para cualquier vista, seguros de enviar por IPC o HTTP:

| Campo | Qué contiene |
| --- | --- |
| `transcript` | La conversación en bloques: las líneas de la persona (`user`), el markdown del agente (`agent`), grupos de llamadas a herramientas con sus etiquetas, resultados y acciones de los subagentes (`tools`), avisos (`notice`, con un tono: `plain`, `dim`, `warn`, `error`) y cuánto duró cada turno (`turn-summary`). |
| `busy`, `turnStartedAt`, `activity`, `subagentActivity` | Un turno en curso, desde cuándo, y qué están haciendo ahora el agente y un subagente. |
| `todos` | La lista de tareas del agente, mientras haya una tarea abierta. |
| `mode`, `switchableModes` | El modo, y aquellos a los que puede cambiar la persona. |
| `turns`, `usage`, `contextPercent` | Los turnos hasta ahora, los tokens usados y cuánto está de lleno la ventana de contexto. |
| `suggestion` | El siguiente prompt previsto por el modelo. |
| `commands`, `commandDetails`, `history` | Los comandos de barra que puede escribir la persona (las skills y comandos de la sesión, entre ellos los de las extensiones, y los propios del chat), lo mismo con lo que hace cada uno y sus argumentos (`{ name, description, argumentHint }`, para un menú que se abre con `/`), y las líneas anteriores de la persona. |
| `language` | El idioma actual del kit: cambia con `setLanguage()`. |
| `panel` | Un punto de control esperando respuesta, con `panels: "state"`: una aprobación (`decision`), una confirmación tras un paso manual (`manual`), texto libre (`text`) o una elección (`choice`, con sus opciones). |
| `choice` | Una elección en lugar del prompt (las conversaciones que reanudar), sin `pick`. |
| `run`, `extensions` | La ejecución en uso, y las extensiones: cuáles se ejecutan (con la descripción y las capacidades de cada una, `about`), cuáles están apagadas y por qué, cuáles están instaladas. |

**Sus acciones**:

| Acción | Qué hace |
| --- | --- |
| `send(line)` | Una línea que ha enviado la persona: un comando de salida (se resuelve con `"exit"`), uno de los comandos del chat (`/resume`, `/plan`, `/extensions`), un comando con barra desconocido (un aviso, nunca se envía) o un turno. |
| `interrupt()` | Detiene el turno en curso. |
| `setMode(mode)`, `cycleMode()`, `togglePlan()` | Cambia el modo según lo permita la sesión. |
| `listRuns()`, `resume(dir?)` | Las ejecuciones que se pueden reanudar, y cambiar a una (sin `dir`, pregunta: `pick`, o el `choice` del estado). |
| `newConversation()` | Una conversación nueva en una ejecución nueva, dejando la actual para reanudarla: el botón "nuevo chat" de una vista gráfica. |
| `setExtension(name, enabled)` | Activa o desactiva una extensión instalada: en la sesión en curso si ya se estaba ejecutando cuando se abrió la sesión; si no, abriendo de nuevo la sesión con la misma conversación. Es una acción, con un aviso, no una línea de la persona; el `extensions` y el `commandDetails` del estado se actualizan. |
| `extensionCatalog(words?)` | El [catálogo](../extensions/installing.md#the-catalog): lo que ofrecen los marketplaces del agente (entre ellos su `officialMarketplace`), solo los de sus `catalogTopics`, que coincidan con `words`, cada uno con su versión, si está instalado, si tiene una actualización, sus `topics`, `logo` y `banner`. |
| `extensionImage(spec, kind)` | El `logo` o el `banner` de una entrada del catálogo, como un fichero que tu página puede servir (`undefined` si no lo tiene), del último catálogo listado. |
| `installExtension(spec, { scope?, confirmed? })` | Instala una del catálogo (`<name>@<marketplace>`) en el ámbito del agente, o en `scope`. Una de un marketplace que no es el propio del agente no se instala hasta que hay `confirmed`: el `confirm` del resultado dice qué marketplace, para que la vista se lo pregunte a la persona. La sesión en curso no se toca: estará en una conversación nueva, o con `reopen()`. |
| `updateExtension(name?)` | Actualiza una instalada desde un marketplace, o todas las que tengan allí una versión más reciente, conservando sus datos y opciones; devuelve los nombres actualizados. |
| `removeExtension(name, { deleteData? })` | Desinstala una, también sus datos con `deleteData`: primero se apaga en la sesión en curso cuando se puede, y si no, se abre de nuevo la sesión. |
| `extensionOptions(name)`, `setExtensionOptions(name, values)` | Las [opciones](../extensions/configuring.md) de una extensión instalada (nunca se da el valor de un secreto), y definirlas desde un formulario, secretos incluidos (un formulario no se guarda en el historial, como sí una línea escrita); `undefined` borra una. Sus servidores se reinician con ellas en la sesión en curso, o la sesión se abre de nuevo. |
| `reopen()` | Abre de nuevo la sesión con lo que está instalado ahora, conservando la conversación: "úsala ya" tras instalar. |
| `setLanguage(language, { note? })` | Cambia el idioma sobre la marcha (`switchLanguage()`) y abre de nuevo la sesión en él, conservando la conversación: el prompt del agente, sus siguientes respuestas, las etiquetas y los avisos del kit. Al modelo también se le dice con el siguiente mensaje de la persona, porque una conversación en otro idioma arrastra las respuestas hacia él; `note` añade tus propias palabras a eso (el nombre del agente en el nuevo idioma). Construye el spec en el abridor, no una sola vez al arrancar, si los textos propios del agente deben seguirle (consulta [Idiomas](../sessions/languages.md#switching-on-the-fly)). |
| `api(extension)` | Lo que una extensión activa entrega al host (el `api` de su contribución), o `undefined`: el `addSource(file, name, subfolder?)` de la extensión `sources` pone en la carpeta de fuentes un fichero que da la persona, sin sobrescribir nunca, reconociendo los duplicados, con la persona como su origen (un "suelta aquí un fichero" en la página). |
| `answer(panelId, answer)` | Responde al `panel` del estado: `"y"`/`"n"` para una decisión, el texto, o los números de las opciones elegidas (`"1,3"`, y el texto de "Other" en las líneas siguientes). |
| `choose(value)` | Responde al `choice` del estado (`null` cancela). |
| `notice(text, tone)` | Un aviso del host (una bienvenida), en la transcripción y en el log de la sesión. |
| `close()` | Termina la ejecución del agente, el log de la sesión y su puerto de interacción. |

Una vista que dibuja según ocurren las cosas (un terminal) sigue en su lugar `onEvent()`: los eventos del agente, las líneas de la persona, los avisos, el inicio y el final de un turno, una conversación anterior que dibujar, un cambio de modo, una sesión abierta de nuevo.

**Puntos de control**: con `panels: "state"` el controlador instala su propio [puerto de interacción](../human-in-the-loop/interaction-port.md), y un punto de control espera en el `panel` del estado hasta `answer()`; el [fichero de respuesta](../human-in-the-loop/response-file.md) sigue funcionando a la vez. Con `panels: "view"` (el valor por defecto) el host instala su propio puerto, como hacen los chats de terminal.

**Iniciar sesión en una extensión** (`signInExtension()`): el controlador abre el enlace en el navegador de este ordenador, y lo añade como un aviso propio (la dirección sola), para que la vista lo muestre como enlace. Un host cuyo navegador no es el de este ordenador, o que tiene su propia forma, pasa `openBrowser`: `false`, o una función (`(url) => shell.openExternal(url).then(() => true)` en Electron).

## Un proceso principal de Electron {#an-electron-main-process}

```ts title="main/agent.ts"
import path from "node:path";
import { app, ipcMain, type BrowserWindow } from "electron";
import { buildSessionOptions, createChatController, resolveClaudeAuth, setLanguage } from "@falkenslab/agent-kit";
import { spec, type Config } from "./spec.js";

export async function startAgent(window: BrowserWindow, workspace: string): Promise<void> {
  if (!resolveClaudeAuth({ claudeCodeOAuthToken: await readTokenFromKeychain() })) {
    window.webContents.send("agent:needs-login");
    return;
  }
  setLanguage(app.getLocale().startsWith("es") ? "es" : "en");

  const runsDir = path.join(app.getPath("userData"), "runs");
  const config: Config = { mode: "guided", projectDir: workspace }; // the spec's extensions find their folders in it
  const chat = await createChatController((run) => buildSessionOptions(config, run.dir, spec, { run }), { runsDir, panels: "state" });

  chat.subscribe((state) => window.webContents.send("chat:state", state));
  ipcMain.handle("chat:send", (_event, line: string) => chat.send(line));
  ipcMain.on("chat:interrupt", () => chat.interrupt());
  ipcMain.on("chat:mode", (_event, mode: "guided" | "interactive" | "plan") => chat.setMode(mode));
  ipcMain.on("chat:answer", (_event, panelId: number, answer: string) => chat.answer(panelId, answer));
  window.on("closed", () => chat.close());
  await chat.start();
}
```

El renderer dibuja `chat:state`: la transcripción, un indicador de actividad mientras hay `busy`, el modo y un diálogo para `panel`.

## Empaquetar una aplicación Electron {#packaging-an-electron-app}

El agente se ejecuta dentro de la aplicación, empaquetada por `electron-builder` en un archivo `asar`. Electron lee ficheros dentro de él para su propio proceso, pero otro proceso no puede: la CLI de Claude Code, que el SDK arranca como un binario nativo (`@anthropic-ai/claude-agent-sdk-<platform>-<arch>`, 209 MB en Windows), y que lee los plugins del agente. Así que la compilación los desempaqueta:

```json title="package.json"
{
  "build": {
    "asarUnpack": [
      "node_modules/@anthropic-ai/claude-agent-sdk-*/**",
      "node_modules/@falkenslab/agent-kit/assets/**",
      "node_modules/@falkenslab/agent-kit/extensions/**",
      "plugin/**"
    ]
  }
}
```

La última línea es la carpeta del plugin propio del agente, esté donde esté. El kit hace el resto: cuando se ejecuta desde dentro de `app.asar`, cada ruta que pasa a otro proceso (los plugins, el lanzador de extensiones) apunta a `app.asar.unpacked`, y le da al SDK el binario desempaquetado de la CLI (`pathToClaudeCodeExecutable`). Sin ellos, un agente empaquetado falla sin avisar: su primer turno se queda colgado, o le faltan sus skills.

Además:

- **`ELECTRON_RUN_AS_NODE`**: si está en el entorno (el terminal de VS Code la define), Electron se ejecuta como Node normal y la aplicación falla en su primer `import { app } from "electron"`. Quítala cuando arranques la aplicación desde un terminal así.
- **Tamaño**: unos 630 MB desempaquetada en Windows (Electron unos 250 MB, el binario de la CLI 209 MB).
- **Firma**: `electron-builder` firma cada ejecutable que empaqueta, incluido el binario de la CLI.
- **Extensiones instaladas**: sus servidores se arrancan con `process.execPath`, que en Electron es la propia aplicación; el kit les define `ELECTRON_RUN_AS_NODE`, así que se ejecutan como Node.

Captain Whiskers es un ejemplo completo: `examples/captain-whiskers/web/` (su host web sobre el controlador, con inicio de sesión desde la página, subidas para `request_file` y a su cofre del tesoro, un menú `/`, acciones rápidas y el idioma cambiado sobre la marcha) y `examples/captain-whiskers/desktop/` (su aplicación Electron y su instalador).

## Cosas a tener en cuenta {#things-to-take-care-of}

- **No importes la interfaz de terminal al arrancar si no la necesitas.** Todo se exporta desde la raíz del paquete; importarlo instala el puerto de interacción del terminal, que `panels: "state"` (o tu propio `setInteractionPort()`) sustituye. De todos modos, el puerto del terminal no hace nada sin TTY.
- **Un idioma y un tema por proceso.** Define el idioma con `setLanguage()` antes de construir las opciones, o cámbialo después con el `setLanguage()` del controlador; los temas solo afectan a la interfaz de terminal.
- **Credenciales**: `resolveClaudeAuth()` nunca pregunta; conseguir un token (una pantalla de inicio de sesión que ejecuta `claude setup-token`, un campo de ajustes) es trabajo de tu host.
- **Dónde van las carpetas de las ejecuciones**: en algún sitio privado del usuario (`app.getPath("userData")`), porque guardan conversaciones enteras.
- **Tu propio lector en su lugar**: un host todavía puede manejar `runQuery()` y `createInputQueue()` por sí mismo. Entonces `prompt-suggestion` llega después de `turn-end` y `mcp-error` antes del primer turno: mantén un único lector para toda la sesión.

## Un servidor {#a-server}

El mismo controlador funciona en un servidor HTTP: uno por conversación, con su estado transmitido al cliente (server-sent events, un WebSocket), las acciones de la persona como peticiones, y `panels: "state"` para los puntos de control. El puerto de interacción es uno por proceso, así que hay una conversación con puntos de control a la vez por proceso. Recuerda que cada sesión ejecuta un subproceso de la CLI: limita cuántas se ejecutan a la vez.
