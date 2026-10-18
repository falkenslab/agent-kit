---
sidebar_position: 1
title: Comportamientos del SDK
description: Comportamientos del Claude Agent SDK y de la CLI, comprobados a mano, en los que el kit se apoya o que sortea.
---

# Comportamientos del SDK

El kit codifica varios comportamientos del Claude Agent SDK (y de la CLI de Claude Code que este ejecuta) que su documentación no menciona, o menciona de otra manera. Cada uno se comprobó contra el SDK real; los comentarios del código fuente los marcan como "confirmed empirically" (confirmado empíricamente). Se vuelven a comprobar en cada actualización del SDK en el kit. Si construyes las sesiones a mano, también necesitas conocerlos.

## Herramientas y permisos {#tools-and-permissions}

- **`disallowedTools` se impone a todo.** Una herramienta no permitida nunca llega a `canUseTool`, y mucho menos se ejecuta.
- **Las herramientas integradas de `tools`/`allowedTools` se aprueban antes de consultar `canUseTool`**, y se lo saltan. El SDK avisa de ello (`CLAUDE_SDK_CAN_USE_TOOL_SHADOWED`); el kit silencia ese aviso concreto.
- **`mcp__*` no es un comodín válido** en `allowedTools` para `mcp__<server>__<tool>`: solo coinciden los comodines por servidor. De ahí `allowAnyMcpTool` como `canUseTool`.
- **Con una lista `tools` explícita, la herramienta `Skill` tiene que estar en ella** para ofrecerse, aunque los skills estén cargados. Sin ella, el modelo busca los ficheros `SKILL.md` a mano.
- **Un `z.record()` en el esquema de una herramienta en proceso hace que el SDK descarte todas las herramientas de ese servidor**, sin avisar: el servidor aparece como conectado, pero sus herramientas no se ofrecen. Las herramientas del kit usan en su lugar listas de pares `{ name, value }`.
- **`disallowedTools` saca de la petición una herramienta integrada, pero no una herramienta MCP.** Un `TodoWrite` o un `Bash` no permitido sale del contexto (3.4k y 1.9k tokens de entrada menos por llamada, medidos); una herramienta MCP en proceso no permitida queda bloqueada, pero su definición se sigue enviando. Solo no registrar el servidor la quita.
- **`TodoWrite` solo existe con `CLAUDE_CODE_ENABLE_TASKS=0`.** Por defecto la CLI ofrece en su lugar sus herramientas `TaskCreate`, `TaskUpdate`, `TaskList` y `TaskGet` y quita `TodoWrite` de la sesión, aunque `tools` la nombre; el kit pasa esa variable en `env` (con el resto de `process.env`). Cada llamada a `TodoWrite` lleva la lista de tareas completa (`{ todos: [{ content, status, activeForm }] }`); su resultado solo dice que se guardó.
- **Una regla `permissions.deny` con una ruta absoluta lleva `//` y la forma POSIX, también en Windows**: `Read(//c/Users/ada/secret.txt)` deniega ese fichero y `Read(//c/Users/ada/secrets/**)` lo que hay en esa carpeta ("File is in a directory that is denied by your permission settings").
- **`Read` lee PDF e imágenes, pero rechaza DOCX y PPTX** ("This tool cannot read binary files"). De ahí `extract_text`.

## Subagentes {#subagents}

- **Un subagente solo puede usar herramientas que estén en el `tools` de la sesión.** Si no, el SDK se niega a lanzarlo ("would be spawned with zero tools… unrecognized [Bash]"). Así que `Bash` tiene que estar en la sesión para que un subagente la use.
- **El tipo de subagente integrado `general-purpose` siempre se puede lanzar**, declare lo que declare `agents`, y hereda todas las herramientas de la sesión. De ahí la puerta (gate) de tipos.
- **`agent_id` solo aparece en la entrada de un hook para las llamadas hechas dentro de un subagente.** La puerta de Bash lo usa.
- **La herramienta `Agent` ejecuta los subagentes en segundo plano por defecto**, y el resultado de un subagente en segundo plano se pierde si el host no gestiona los mensajes de tareas. `AgentDefinition.background: false` no lo cambia; reescribir `run_in_background` en un hook `PreToolUse`, sí. De ahí la puerta de primer plano.
- **La entrada de la herramienta `Agent` es `{ description, prompt, subagent_type }`.**

## Mensajes y resultados {#messages-and-results}

- **Un turno puede informar de `subtype: "success"` con `is_error: true`** (un error de la API, como de facturación o de acceso), con el mensaje real en `result`. Comprueba `is_error` (el `failed` del kit), no el subtipo.
- **Un comando con barra desconocido produce un mensaje `system`**, no texto: si no se gestiona, la sesión parece muda. El kit lo convierte en un evento `info`, y los chats detectan los comandos desconocidos antes de enviarlos.
- **Un turno interrumpido termina con una línea de error interna `[ede_diagnostic]`**; el kit la filtra.
- **Las sugerencias de prompt llegan después del `result` de su turno.**
- **El iterable del prompt tiene que seguir abierto** para una sesión de varios turnos: el SDK cierra el transporte cuando termina ("ProcessTransport is not ready for writing" en el siguiente mensaje). De ahí `createInputQueue()`.
- **`usage` y `total_cost_usd` en un resultado son acumulados** para la sesión en el modo de entrada en streaming.

## Configuración y contexto {#configuration-and-context}

- **Sin `settingSources`, se cargan todas las fuentes**, la del usuario incluida, y una opción `language` ahí se convierte en una regla del prompt del sistema que se impone a la del agente.
- **La auto-memoria de quien lo ejecuta se carga diga lo que diga `settingSources`**; `settings.autoMemoryEnabled: false` la deja fuera.
- **El contexto de git (con el nombre de usuario de git de quien lo ejecuta) viene con las instrucciones de git**; `settings.includeGitInstructions: false` lo quita.
- **Los conectores de claude.ai de la cuenta con la sesión iniciada se cargan diga lo que diga `settingSources`** (una sesión con `settingSources: []` recibió las ocho herramientas de un conector); `settings.disableClaudeAiConnectors: true` los deja fuera. A un servidor MCP pasado en `mcpServers` no le afecta.
- **El nombre y el correo electrónico de la cuenta con la sesión iniciada están siempre en el contexto** (de `~/.claude.json`); solo un `CLAUDE_CONFIG_DIR` aparte lo evita.
- **Los comandos de los plugins funcionan sin estar en la lista `skills`.**
- **El skill de un plugin se llama como su carpeta**: `<plugin>:<folder>`, diga lo que diga el `name` de su frontmatter; un `SKILL.md` sin frontmatter no se carga. Los subagentes de un plugin (`agents/*.md`) también se cargan, como `<plugin>:<name>`.
- **Unos veinte skills vienen con el propio SDK** (`deep-research`, `dataviz`, `code-review`, `loop`…), incluso con `settingSources: []`: `skills` es lo que los deja fuera del contexto.
- **El reparto entre categorías de `getContextUsage()` puede despistar** (skills contados como herramientas del sistema cuando se filtran), y antes del primer turno cuenta las herramientas MCP en proceso como 0 tokens (15.5k estimados para una sesión cuya primera llamada ocupó 23.7k); el uso de la API de una llamada es la medida fiable.

## Cambiar una sesión en marcha {#changing-a-running-session}

- **`toggleMcpServer(name, false)` saca de la sesión un servidor dado en `mcpServers`**: sus herramientas salen del contexto del modelo (si se le pide que llame a una, dice que no tiene ninguna) mientras los demás servidores siguen funcionando; `true` lo devuelve. El kit desactiva y activa así una extensión instalada.
- **Un plugin se carga a través de un enlace, y `reloadPlugins()` lo sigue**: una ruta de plugin que es un enlace (una junction en Windows) carga el plugin al que apunta; si se quita el enlace, `reloadPlugins()` lo descarga sin error, y con el enlace de vuelta, lo carga de nuevo. El kit monta así las extensiones instaladas en lugar de copiarlas.
- **Desactivar un servidor stdio, o cerrar la sesión, termina todo su árbol de procesos**: un hijo que haya arrancado, y los hijos de ese hijo (un navegador que abrió Playwright, con sus procesos), terminan con él, así que un perfil que tuviera no se queda bloqueado para el siguiente arranque. Confirmado en Windows, donde la CLI termina el árbol en menos de un segundo; `test/core/extensionProcesses.test.ts` lo comprueba allí donde esté el binario de la CLI.
- **`mcpServerStatus()` da las herramientas de cada servidor con lo que dicen de sí mismas**: `annotations.readOnly` aparece exactamente cuando el servidor declara `readOnlyHint: true` (tanto `false` como no indicar nada lo dejan fuera), con los nombres cortos de las herramientas. Un servidor stdio está `pending`, sin herramientas, durante unos segundos tras arrancar la sesión, y vuelve `connected` con sus herramientas al activarse de nuevo. El modo plan del kit lee de ahí las herramientas de solo lectura de las extensiones instaladas.
- **`setMcpServers()` no toca los servidores dados al arrancar.** Solo sustituye los que añadió él mismo: quitar un servidor de arranque de su conjunto no quita nada (`removed: []`, sigue conectado), y volver a añadirlo añade una segunda copia dinámica. Nombrar un servidor stdio de arranque con otra configuración es distinto (medido el 13 de octubre de 2026): lo arranca con esa configuración, pero el proceso antiguo sigue ejecutándose hasta que se cierra la sesión, y los servidores en proceso (`sdk`) que no nombra se quitan (`removed: ["time"]`). No sirve para darle a un servidor una configuración nueva.
- **`onElicitation` recibe el `elicitation/create` de un servidor MCP, y su respuesta vuelve al servidor**: la CLI declara la capacidad `elicitation` a todos los servidores y le pasa la petición (`serverName`, `message`, `mode`, `requestedSchema`). Una enviada mientras arranca el servidor, antes de que la sesión esté lista, se responde con `cancel` sin llamarlo (medido el 13 de octubre de 2026). Sin `onElicitation`, todas las peticiones se rechazan. El kit pregunta a la persona ([Servidores que preguntan a la persona](../human-in-the-loop/elicitation.md)).
- **Un plugin cuyo `userConfig` limita un campo a valores fijos (`options`) necesita la CLI 2.1.271 o posterior**: una más antigua se niega a cargarlo entero, así que faltan sus skills, comandos y subagentes (sus servidores MCP siguen ejecutándose cuando el kit los arranca). Medido con la CLI 2.1.266 (SDK 0.3.266) y 2.1.300 (SDK 0.3.300, que el kit exige desde entonces).
- **`reconnectMcpServer(name)` reinicia un servidor**: su proceso termina y arranca uno nuevo con la configuración de la sesión, que vuelve a leer todo del disco; los demás no se tocan. El kit aplica así una [opción](../extensions/configuring.md) cambiada de una extensión instalada, y la CLI pasa `${user_config.KEY}` en el `env` de un servidor tal cual al lanzador del kit.
- **`reloadPlugins()` vuelve a leer las carpetas de plugins dadas al arrancar**: una carpeta vaciada pierde sus skills, comandos y subagentes en la sesión, y al volver a llenarse regresan. Una ruta de plugin con la que la sesión no arrancó no se puede añadir así.

- **Un servidor MCP remoto detrás de OAuth informa `needs-auth`, y el CLI no hace nada por sí solo** (CLI 2.1.300): ni navegador, ni elicitación, ni herramienta de inicio de sesión para el modelo. El `Query` del SDK tiene `mcpAuthenticate(name)` (que da la `authUrl` y espera en una vuelta a localhost), `mcpSubmitOAuthCallbackUrl(name, url)` y `mcpClearAuth(name)`, que no están en sus tipos: el kit solo los llama cuando existen ([ADR-028](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-028-remote-mcp-sign-in.md)). Una vuelta pegada guarda el token, pero el servidor sigue en `needs-auth` en esa sesión hasta `reconnectMcpServer()`; una sesión nueva queda conectada al momento.
- **Los tokens de OAuth se guardan por nombre de servidor, en la carpeta de configuración del CLI** (`<CLAUDE_CONFIG_DIR>/.credentials.json`), y `settingSources` no los aísla: un servidor que se llama como uno del Claude Code de quien lo ejecuta inicia sesión con su token. El kit llama al servidor remoto de una extensión `<extensión>-<servidor>`.
- **Una cabecera `Authorization` desactiva el OAuth de un servidor remoto**: un 401 lo hace fallar entonces («OAuth fallback is disabled when headers.Authorization is set»), así que el kit omite una cabecera cuya opción no tiene valor.

## Sesiones {#sessions}

- **Un `SessionStore` recibe cada entrada de la transcripción y se le piden antes de reanudar.** Una sesión reanudada conserva su id y recuerda la conversación, subagentes incluidos, incluso con la copia propia de la CLI borrada. La copia de la CLI siempre se escribe mientras se usa un almacén.
- **`CLAUDE_CONFIG_DIR` solo mueve la raíz** del almacenamiento de la CLI; `<dir>/projects/<encoded cwd>/` es fijo.

## Terminal {#terminal}

- **Un `readline.question()` sin TTY sigue escribiendo su pregunta en stdout**, aunque nunca pueda responderse; el kit se salta readline por completo sin TTY.
- **readline lleva la cuenta de cuántas filas usó su prompt** (`prevRows`), que se queda desfasada cuando cualquier otra cosa escribe en la terminal; el chat plano la reinicia tras cada escritura.
