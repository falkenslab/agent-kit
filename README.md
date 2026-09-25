# agent-kit

Librería para construir agentes de IA sobre el [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). No es un agente en sí mismo: es la capa reutilizable de infraestructura (wiring de sesión, hooks de human-in-the-loop, herramientas MCP genéricas, logging de transcripción, un TUI de chat en terminal, autenticación, configuración global, formateo de etiquetas de herramientas) que cualquier agente concreto puede montar encima, aportando solo lo que de verdad es específico de su dominio.

> **Estado:** versión `0.x`, API todavía no estable. Aún no se publica en npm.

## ¿Qué resuelve?

Construir un agente sobre el Claude Agent SDK implica resolver, una y otra vez, el mismo conjunto de problemas independientes del dominio:

- **Niveles de autonomía** (¿el agente pide confirmación antes de cada paso? ¿solo antes de acciones irreversibles? ¿nunca?).
- **Un canal humano-en-el-bucle** que funcione tanto si hay un humano delante de un terminal interactivo como si el proceso lo está pilotando otra herramienta sin stdin.
- **Delegación segura a subagentes**: el SDK expone atajos (el tipo `general-purpose` incorporado, ejecución en segundo plano por defecto) que, sin guardas explícitas, permiten saltarse las restricciones de herramientas que el agente principal cree tener.
- **Permisos de herramientas MCP** dinámicos, para que un proyecto pueda declarar sus propios servidores MCP (`.mcp.json`) sin que el código del agente tenga que conocerlos de antemano.
- **Transcripción y redacción de secretos**, autenticación con Claude, configuración global por aplicación, y una forma consistente de mostrar en consola qué está haciendo el agente.

`agent-kit` resuelve cada uno de estos problemas una sola vez, de forma genérica, y los deja disponibles para cualquier agente concreto a través de un único punto de extensión: la interfaz `AgentSpec`.

## Instalación

Aún no está publicado en npm. Se instala como dependencia `file:` desde un repo hermano:

```json
{
  "dependencies": {
    "@falkenslab/agent-kit": "file:../agent-kit"
  }
}
```

Requiere Node.js `>=20` y, como *peerDependency*, `@anthropic-ai/claude-agent-sdk`.

## Idea central: `AgentSpec` + `buildSessionOptions`

Un agente concreto implementa `AgentSpec<TConfig>` para aportar lo que es genuinamente específico de su dominio: el system prompt, los servidores MCP propios, las rutas de plugins (skills/comandos), los subagentes opcionales que registra y los textos de los checkpoints humanos. `buildSessionOptions()` se encarga de todo lo que es genérico y se deriva únicamente del modo de ejecución.

```ts
import {
  buildSessionOptions,
  runQuery,
  type AgentSpec,
  type BaseSessionConfig,
} from "@falkenslab/agent-kit";

interface MyConfig extends BaseSessionConfig {
  // Todo lo que sea específico de tu dominio va aquí - incluido un "role"/persona
  // ("student"/"teacher", ...) si tu agente distingue perfiles; BaseSessionConfig no lo
  // impone porque no es algo que `buildSessionOptions()` interprete.
  courseUrl: string;
  role: "student" | "teacher";
}

const spec: AgentSpec<MyConfig> = {
  buildSystemPrompt: (config) => `Eres un agente para ${config.courseUrl}, hablando con un ${config.role}...`,
  buildMcpServers: () => ({ /* servidores MCP propios del dominio, ej. Playwright */ }),
  pluginRoots: () => [],       // rutas absolutas a plugins locales (skills/commands)
  buildSubagents: () => undefined, // o { agents, allowedSubagentTypes } si delega en subagentes
};

const config: MyConfig = {
  mode: "guided",
  projectDir: process.cwd(),
  courseUrl: "https://...",
  role: "student",
};

const { options, transcriptPath } = await buildSessionOptions(config, runDir, spec);

const run = runQuery("Haz X", options);
for await (const event of run.events) {
  if (event.type === "text") process.stdout.write(event.text);
  if (event.type === "turn-end") console.log(event.failed ? event.errorText : event.resultText);
}
```

### Chat en terminal listo para usar: `runChatTui`

Para un agente de chat en terminal no hace falta escribir el bucle de lectura/impresión a mano — `runChatTui()` lo hace por ti a partir de las mismas `Options` que ya construiste:

```ts
import { buildSessionOptions, runChatTui } from "@falkenslab/agent-kit";

const { options } = await buildSessionOptions(config, runDir, spec);

await runChatTui(options, {
  welcomeMessage: "Listo. Escribe /exit para salir.",
});
```

Pasa `sessionLogPath` para que, además, se vuelque a un fichero (texto plano, sin colores ANSI) todo lo que aparece en la terminal — bienvenida, cada línea que escribe el humano, la respuesta del agente y las líneas de acción — a diferencia de `transcriptPath` (de `buildSessionOptions()`), que solo se escribe si el agente llega a invocar alguna herramienta, `sessionLogPath` se crea siempre que se pase, incluso en una conversación que nunca usa ninguna.

Pasa `historyPath` para persistir cada línea no vacía que el humano escribe (`{text, timestamp}`, un objeto JSON por línea) y recargarla al arrancar como historial de `readline` — así ↑/↓ recorre prompts anteriores, incluso de otra ejecución, si `historyPath` apunta a una ruta fija en vez de a una carpeta por sesión. Se recorta a los `historyLimit` más recientes (100 por defecto), descartando los más antiguos.

Pasa `initialPrompt` para que el agente actúe primero, antes de esperar al humano — se envía como si fuera la primera línea que alguien escribió, en cuanto arranca el chat (útil para un agente que debe hacer algo nada más empezar, como iniciar sesión en algún sitio, en vez de quedarse esperando en el prompt). Ver el repo hermano `student-agent`.

Se encarga de todo: leer líneas por teclado, enviarlas a la sesión multi-turno, imprimir el texto de la respuesta en streaming y las acciones (herramientas) con etiquetas legibles, interrumpir el turno en curso con Ctrl+C (sin cerrar la sesión) y salir limpiamente con `/exit` o Ctrl+C en el prompt. Además, coordina su propio `readline` con cualquier checkpoint humano que la sesión dispare (el step gate del modo `interactive`, o las herramientas de aprobación/intervención manual), así que nunca compiten por el teclado.

Si escribes algo que empieza por `/` y no coincide con ningún comando registrado (propio, de un plugin, o de los propios de Claude Code), se avisa con `Unknown command: /lo-que-sea` y no llega a enviarse al agente — sin esto, una línea así habría llegado al modelo como texto literal sin ningún manejo especial, indistinguible de no haber escrito nada.

### Modos de ejecución (`BaseSessionConfig.mode`)

| Modo | Comportamiento |
|---|---|
| `interactive` | Pausa antes de **cada** llamada a herramienta y pide confirmación (step gate). |
| `guided` | Solo pausa antes de acciones difíciles de deshacer o visibles para terceros (herramienta de aprobación disponible). |
| `autonomous` | Sin canal humano-en-el-bucle: ni aprobación ni intervención manual. |

Deliberadamente independiente de si la sesión es de una sola pregunta o una conversación multi-turno — eso lo decide el propio caller usando `runChatTui()`/`createInputQueue()` frente a una llamada directa a `query()`, no este campo. Un agente concreto que necesite saber "esto es una sesión de chat" para su propio propósito (p. ej. elegir otra plantilla de system prompt) debe llevar ese dato como su propio campo de dominio, no mezclarlo con `mode`.

Todo lo demás (qué herramientas están disponibles, qué hooks se registran, qué servidores MCP genéricos se activan) se deriva de este campo más de si hay `contextDir`/`knowledgeDir` configurados — el agente concreto no tiene que replicar esa lógica.

## Ejemplo

[`examples/captain-whiskers/`](./examples/captain-whiskers) es un agente mínimo y funcional construido sobre este kit: un gato pirata que corre siempre en modo `autonomous`. Se ejecuta directamente con `npx tsx examples/captain-whiskers/agent.ts` — sin instalación aparte, ver su propio README.

## Qué incluye

Todo lo de abajo salvo lo marcado "TUI" vive en `src/core/` — sin ninguna dependencia de terminal (`console.*`/`process.stdout`/`readline`), usable tal cual desde un proceso principal de Electron, un servidor, o un sidecar que hable con un host sin Node (Tauri 2, cuyo lado Rust/webview no puede ejecutar este paquete directamente). `src/tui/` es la única carpeta que sí asume un terminal.

- **`buildSessionOptions()` / `runQuery()`** (`core/session.ts`, `core/runner.ts`) — construcción de las `Options` del SDK a partir de un `AgentSpec`, y un wrapper fino sobre `query()` que normaliza el stream de mensajes crudo en eventos (`text`, `action`, `mcp-error`, `info`, `turn-end`) fáciles de consumir desde una consola, un chat o un puente IPC.
- **`createInputQueue()` / `createDeferred()`** (`core/session.ts`) — cola de mensajes de usuario respaldada por un único generador de larga duración, necesaria para sesiones de chat multi-turno (el SDK cierra el transporte en cuanto el `AsyncIterable` pasado como prompt termina de iterar).
- **Modelo de seguridad para subagentes** (`core/hooks/subagentBashGate.ts`, `subagentTypeGate.ts`, `subagentForegroundGate.ts`) — tres hooks `PreToolUse` que, juntos, confinan `Bash` a los subagentes declarados, restringen `subagent_type` a los realmente registrados (el tipo incorporado `general-purpose` del SDK, si no se bloquea, hereda todas las herramientas de la sesión) y fuerzan ejecución en primer plano (por defecto el SDK delega en segundo plano y una invocación puede perderse en silencio si nadie escucha su finalización).
- **Canal humano-en-el-bucle** (`core/hooks/humanInput.ts`, `core/hooks/stepGate.ts`, `core/tools/humanApproval.ts`, `core/tools/manualLogin.ts`) — una única función (`askForDecision`) que compite entre teclado interactivo (solo si `stdin` es un TTY — si no, ni imprime nada ni crea ningún `readline.Interface`) y un archivo de respuesta, usada tanto por el step gate del modo `interactive` como por las herramientas MCP `request_human_approval` y `request_manual_login`. Esta última solo se ofrece cuando tu `AgentSpec` define `manualInterventionTexts` — es la señal de que tu dominio tiene alguna interfaz en vivo (una ventana de navegador, por ejemplo) en la que un humano podría intervenir a mano; si no la defines, la herramienta ni aparece.
- **Permisos de herramientas MCP** (`core/mcpPermissions.ts`) — `allowAnyMcpTool`, un `canUseTool` que aprueba dinámicamente cualquier `mcp__<server>__<tool>`, permitiendo que un proyecto registre servidores MCP propios (`.mcp.json`) sin que el kit tenga que conocerlos de antemano.
- **Logging de transcripción** (`core/hooks/transcriptLogger.ts`) — registra cada llamada a herramienta (petición + resultado) como una línea JSON, con redacción automática de secretos configurados y del token de autenticación, y resumen de payloads grandes (capturas en base64, textos largos).
- **Herramienta `save_to_knowledge`** (`core/tools/saveToKnowledge.ts`) — copia un archivo generado durante la ejecución (ej. algo recién descargado) a la carpeta `knowledge/` del proyecto, para que quede legible en sesiones futuras.
- **TUI de chat en terminal** (`tui/chatTui.ts`) — `runChatTui()`, ver arriba.
- **Autenticación con Claude** — `resolveClaudeAuth(config?)` (`core/claudeAuth.ts`) resuelve el token en orden `ANTHROPIC_API_KEY` → `CLAUDE_CODE_OAUTH_TOKEN` → `config.claudeCodeOAuthToken` si se lo pasas, sin ningún I/O (segura de llamar desde un proceso sin terminal, ej. Electron) — el kit no guarda ningún token por su cuenta, de dónde lo saques entre ejecuciones es cosa tuya. `ensureClaudeAuth(config?)` (`tui/claudeAuth.ts`) la envuelve para terminales: si no encuentra token, ofrece generarlo con `claude setup-token` y te devuelve el nuevo token para que lo guardes tú donde quieras.
- **Formateo de etiquetas de herramientas** (`core/toolLabels.ts`) — traduce nombres técnicos de herramientas (ej. `mcp__playwright__browser_click`) a descripciones legibles en consola, extensible por el agente concreto para sus propias herramientas de dominio. No es exclusivo del TUI: cualquier presentación (incluida una app de escritorio) puede reutilizarlo, ya que devuelve texto plano sin colores.
- **Utilidades de consola** (`tui/ui.ts`) — paleta de colores consistente (`agent`, `action`, `heading`, `success`, `warn`, `error`, `dim`), usada por el TUI y por `ensureClaudeAuth()`.
- **Carga de prompts con plantillas** (`core/promptTemplate.ts`) — sustitución `{{variable}}` sobre archivos de prompt, con fallo explícito si falta una variable.

Consulta [`CLAUDE.md`](./CLAUDE.md) para el detalle de cada pieza y las decisiones de diseño (incluyendo comportamientos del SDK confirmados empíricamente que motivan varios de estos guardarraíles).

## Desarrollo

```
npm run build       # tsc — compila src/ a dist/ (incluye .d.ts)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # tsx --test "test/**/*.test.ts"
```

Para ejecutar un único archivo de test:

```
npx tsx --test test/tui/promptErrors.test.ts
```
