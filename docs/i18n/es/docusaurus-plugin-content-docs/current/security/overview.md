---
sidebar_position: 1
title: Visión general
description: Cada salvaguarda que configura el kit, contra qué protege y dónde se aplica.
---

# Visión general de la seguridad

Un agente actúa a través de herramientas, así que las salvaguardas del kit están en las herramientas: cuáles existen, cuáles están aprobadas y qué puede tocar cada llamada. Se aplican en las opciones del SDK y en hooks `PreToolUse`, que se ejecutan antes de cada llamada a una herramienta, tanto del agente principal como de sus subagentes. El modelo no puede convencer a un hook para que no deniegue; a una línea del prompt, sí.

| Salvaguarda | Protege contra | Dónde | Página |
| --- | --- | --- | --- |
| Conjunto mínimo de herramientas | que el modelo use herramientas que no le corresponden al agente (la CLI tiene docenas) | `tools` / `allowedTools` | [Opciones de la sesión](../core-concepts/session-options.md#tools) |
| `disallowedTools` | una herramienta concreta, incluida una peligrosa de un servidor MCP | el SDK, antes que cualquier otra cosa | [AgentSpec](../core-concepts/agent-spec.md#disallowedtools) |
| Ámbito de ficheros | escrituras fuera de las carpetas del agente, ediciones de originales, búsquedas por todo el proyecto, lectura de ficheros protegidos | hook `PreToolUse` | [Ámbito de ficheros](file-scope.md) |
| Puerta de tipo de subagente | el subagente integrado `general-purpose` del SDK, que hereda todas las herramientas | hook `PreToolUse` | [Puertas de subagentes](subagent-gates.md) |
| Puerta de Bash de subagentes | que el agente principal ejecute comandos de shell | hook `PreToolUse` | [Puertas de subagentes](subagent-gates.md) |
| Puerta de primer plano de subagentes | subagentes lanzados en segundo plano y perdidos sin aviso | hook `PreToolUse` | [Puertas de subagentes](subagent-gates.md) |
| Aprobación MCP | nada: aprueba cada llamada `mcp__*` para que funcionen los servidores del proyecto | `canUseTool` | [Permisos y aislamiento](permissions-and-isolation.md) |
| Fuentes de configuración, auto-memoria, contexto de git | que la configuración personal de Claude Code de quien lo ejecuta se filtre al agente | opciones del SDK | [Permisos y aislamiento](permissions-and-isolation.md) |
| Puerta de pasos, aprobaciones | acciones que una persona debería ver antes | hook y herramienta | [La persona en el bucle](../human-in-the-loop/overview.md) |
| Puerta del plan | cambios mientras el agente solo debe planificar | hook `PreToolUse` | [Modos](../core-concepts/modes.md#plan) |
| Puerta del modo guiado | que una herramienta de una extensión instalada cambie cosas sin el sí de la persona, en modo guiado, haga lo que haga antes el modelo | hook `PreToolUse` (`extensionGate`, las `confirmTools` del manifiesto) | [Aprobaciones](../human-in-the-loop/approvals.md#extensions-tools-that-change-things) |
| Secretos ocultos en la transcripción | secretos escritos en los logs | hook `PreToolUse`/`PostToolUse` | [Transcripción](transcript.md) |
| Puerta de lo remoto | datos que salen del ordenador hacia un servidor MCP remoto, y un conector de claude.ai que el agente no eligió | hook `PreToolUse` (`remoteServers`, `claudeAiConnectors`) | [Configuración de la sesión](../core-concepts/session-config.md) |
| Extensiones instaladas aparte | que el servidor de una extensión instalada vea las credenciales del agente, o que sus ficheros cambien tras instalarla | el lanzador, el hash del lock | [Extensiones](../extensions/overview.md#where-they-run) |
| Confianza en el workspace | que un workspace clonado o compartido ejecute el código de sus extensiones sin que la persona lo acepte | el `.trust.json` del agente, fuera del proyecto | [Las extensiones de un workspace](../extensions/workspaces.md) |

## Lo que el kit no protege {#what-the-kit-does-not-protect}

- **Bash.** Un subagente con `Bash` puede llegar a cualquier ruta y ejecutar cualquier comando que pueda el usuario. El ámbito de ficheros no se le aplica. Haz que Bash sea opcional y explícito, y prefiere [una herramienta dedicada](../capabilities/tools-and-mcp.md#in-process-tools-tool-and-createsdkmcpserver).
- **Tus herramientas MCP.** Una herramienta que registras se ejecuta con los permisos de tu proceso. Valida sus entradas, y pon las destructivas detrás de una [aprobación](../human-in-the-loop/overview.md#asking-from-your-own-code) o en `disallowedTools`.
- **El contenido web.** `WebFetch` y `WebSearch` meten texto no confiable en el contexto (inyección de prompts). Las salvaguardas de arriba limitan lo que una instrucción inyectada puede hacer que haga el agente; no impiden que el agente la lea.
- **Las carpetas de las ejecuciones.** Guardan conversaciones enteras y resultados de herramientas, sin ocultar los secretos. Mantenlas fuera del control de versiones y de las carpetas compartidas.
- **Los prompts.** "Nunca hagas X" en un prompt es una petición. Todo lo que nunca deba ocurrir va en `disallowedTools` o en un hook.

## Una lista de comprobación para un agente nuevo {#a-checklist-for-a-new-agent}

1. Dale las carpetas más estrechas: la de la extensión `knowledge` para las notas, la de la extensión `sources` para los originales, nada más salvo que haga falta.
2. Dale solo las carpetas que debe leer (la carpeta de fuentes, `extraReadableDirs`): [no lee nada más](file-scope.md#what-the-agent-can-read). Pon cada fichero secreto que haya dentro en `deniedPaths` y cada valor secreto en `secrets`.
3. Prohíbe todas las herramientas que no quieras, sobre todo las de servidores MCP de terceros.
4. Prefiere herramientas pequeñas a Bash; si un subagente de verdad necesita Bash, que sea opcional y explícito.
5. Arranca los agentes nuevos en modo `interactive` o `guided`.
6. Deja `settingSources` en su valor por defecto (`["project"]`) o más restringido.
7. Añade `.env` y tu carpeta de ejecuciones a `.gitignore`.
