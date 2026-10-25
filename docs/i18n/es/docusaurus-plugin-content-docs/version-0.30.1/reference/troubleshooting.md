---
sidebar_position: 2
title: Solución de problemas
description: Problemas habituales al construir o ejecutar un agente con el kit, y sus soluciones.
---

# Solución de problemas

## El agente no arranca: no hay token de autenticación de Claude {#the-agent-doesnt-start-no-claude-authentication-token}

Define `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token` crea uno con una suscripción Pro/Max) o `ANTHROPIC_API_KEY`. Node no lee los ficheros `.env` por sí solo: carga el tuyo con `process.loadEnvFile()` (consulta [Autenticación](../getting-started/authentication.md)).

## `ERR_REQUIRE_ESM` o "Cannot use import statement outside a module" {#err_require_esm-or-cannot-use-import-statement-outside-a-module}

El kit es solo ESM. Añade `"type": "module"` a tu `package.json`, o usa ficheros `.mts`.

## El agente responde en el idioma equivocado {#the-agent-answers-in-the-wrong-language}

- Fuérzalo: `--language=en`, o `language: "en"` en la configuración.
- Escribe en inglés los prompts, skills y comandos que lee el modelo.
- El nombre de la cuenta de Claude Code de quien lo ejecuta todavía puede arrastrar las respuestas; consulta [Idiomas](../sessions/languages.md#limits).

## "Unknown command: /something" {#unknown-command-something}

El comando no existe en esta sesión. Los comandos de los plugins llevan espacio de nombres: `/my-plugin:something`. Comprueba el `name` del plugin en `.claude-plugin/plugin.json`, y que `pluginRoots()` devuelve su carpeta.

## Un skill nunca se usa {#a-skill-is-never-used}

- Su `description` debe decir cuándo aplicarlo.
- Con una lista `skills` en la spec, tiene que estar en ella (`plugin:skill` para el de un plugin).
- La sesión necesita la herramienta `Skill`: se añade con plugins o con herramientas de ficheros.

## "… can't be written: writing is only allowed inside …" {#-cant-be-written-writing-is-only-allowed-inside-}

Lo denegó el [ámbito de ficheros](../security/file-scope.md). Solo se permite escribir en `extraWritableDirs`; la carpeta de fuentes es de solo lectura por diseño, y a las de la base de conocimiento y la memoria solo se llega a través de sus herramientas. Añade una carpeta a `extraWritableDirs` si el agente la necesita.

## "Grep only searches inside …" {#grep-only-searches-inside-}

`Grep` necesita un `path` dentro de la carpeta de fuentes, de `extraWritableDirs` o de `extraReadableDirs`. Dile al agente dónde buscar, o añade la carpeta.

## Un subagente nunca se ejecuta, o "Delegation is only available for …" {#a-subagent-never-runs-or-delegation-is-only-available-for-}

- Solo se pueden lanzar los tipos de `allowedSubagentTypes`; comprueba que el nombre que usa el modelo coincide con una clave de `agents`.
- Cada herramienta que declara un subagente debe existir en la sesión. Una herramienta integrada que la sesión no tiene (una herramienta de ficheros sin la extensión de fuentes, `extraWritableDirs` ni `extraReadableDirs`) hace que el SDK se niegue a lanzarlo.
- Di en el prompt del sistema cuándo usar cada subagente.

## Falta un servidor MCP {#an-mcp-server-isnt-there}

El chat muestra "Some MCP servers failed to connect: …". Ejecuta a mano el comando del servidor para ver su error. Las herramientas de los servidores externos solo existen si el servidor arranca.

## El panel de aprobación nunca aparece en modo guiado {#the-approval-panel-never-shows-up-in-guided-mode}

El modelo decide cuándo llamar a la herramienta de aprobación. Redacta `humanApprovalTexts.description` para tu dominio y refuérzalo en el prompt; para algo que siempre deba preguntar, pregunta desde tu propia herramienta con `askForDecision()` o usa el modo `interactive`.

## Los puntos de control se quedan colgados en un job en segundo plano {#checkpoints-hang-in-a-background-job}

Sin TTY, los puntos de control esperan al [fichero de respuesta](../human-in-the-loop/response-file.md). Usa el modo `autonomous` para las ejecuciones desatendidas, o responde a través del fichero.

## Pantalla con caracteres corruptos o desalineada {#garbled-or-misaligned-screen}

- Usa una terminal con Unicode y color de 24 bits (Windows Terminal, iTerm2, la mayoría de las terminales de Linux).
- No uses emoji en el arte de la cabecera ni en etiquetas dibujadas en posiciones fijas: usa caracteres de una columna.
- Prueba con `fullscreen: false`, o con `plain: true` para el chat de readline.

## `/resume` no lista una conversación antigua {#resume-doesnt-list-an-old-conversation}

Solo se listan las ejecuciones con un `session.json` (creadas con una carpeta de ejecuciones y un abridor de sesión).

## Los tokens por llamada son muchos {#tokens-per-call-are-high}

Lista tus skills (`skills`), no cargues ficheros de configuración (`settingSources: []`) y concede solo las herramientas que necesitas. Consulta [Contexto y coste](../sessions/context-and-cost.md).
