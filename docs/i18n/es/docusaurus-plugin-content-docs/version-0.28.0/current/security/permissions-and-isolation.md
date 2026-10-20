---
sidebar_position: 4
title: Permisos y aislamiento
description: Cómo se aprueban las llamadas a herramientas, y cómo el kit mantiene la configuración de Claude Code de quien lo ejecuta lejos del agente.
---

# Permisos y aislamiento

## Cómo se aprueba una llamada a una herramienta {#how-a-tool-call-is-approved}

En orden:

1. **`disallowedTools`**: si la herramienta está ahí, se deniega. No se consulta nada más.
2. **`allowedTools`**: las herramientas integradas que concedió el kit están preaprobadas.
3. **`canUseTool`**: todo lo demás. El `allowAnyMcpTool` del kit aprueba cualquier `mcp__<server>__<tool>` y deniega el resto.
4. **Hooks `PreToolUse`**: se ejecutan en cada llamada que ha llegado hasta aquí, y aún pueden denegarla (ámbito de ficheros, puertas, puerta de pasos).

`allowAnyMcpTool` existe porque una entrada de `allowedTools` como `mcp__*` no coincide con `mcp__<server>__<tool>` en el SDK, y los servidores declarados en el `.mcp.json` de un workspace no se conocen de antemano. Poner un `.mcp.json` en un workspace es la aceptación explícita de su dueño, la misma confianza que añadir una skill a `.claude/skills/`. También silencia el aviso `CLAUDE_SDK_CAN_USE_TOOL_SHADOWED` del SDK, que es esperable con esta configuración.

## Mantener fuera la configuración de quien lo ejecuta {#keeping-the-runners-configuration-out}

El SDK ejecuta la CLI de Claude Code, que por defecto carga la configuración de quien la ejecuta. Un agente construido con el kit no debería comportarse de forma distinta según la persona que lo ejecute, así que el kit restringe lo que se carga:

| Opción | Valor del kit | Sin ella |
| --- | --- | --- |
| `settingSources` | `["project"]` | El `~/.claude/settings.json` de quien lo ejecuta (su `language`, estilo de salida, hooks, permisos), su `CLAUDE.md` personal y sus skills llegan al agente. Un `"language": "Spanish"` ahí hizo que un agente francés respondiera en español. |
| `settings.autoMemoryEnabled` | `false` | La memoria de Claude Code de quien lo ejecuta para el repositorio (`~/.claude/projects/<repo>/memory/MEMORY.md`) se carga diga lo que diga `settingSources`. |
| `settings.includeGitInstructions` | `false` | Las instrucciones de commit y el contexto de git de la CLI, incluido el nombre de usuario de git de quien lo ejecuta, que arrastraba las respuestas a su idioma. |
| `settings.disableClaudeAiConnectors` | `true` | Los conectores de claude.ai de la cuenta con la que se ejecuta la sesión (Drive, Gmail, documentos…), que la CLI carga diga lo que diga `settingSources`: sus herramientas leerían y escribirían los datos propios de quien lo ejecuta, y costarían contexto en cada llamada. Un servidor MCP que pasa el propio agente no se ve afectado. |

### Elegir las fuentes de configuración {#choosing-setting-sources}

```ts
settingSources: ["project"], // default: the workspace's .claude/ and CLAUDE.md files
settingSources: [], // nothing from disk at all, CLAUDE.md included
settingSources: ["project", "local"], // plus .claude/settings.local.json
settingSources: ["user", "project"], // the runner's personal configuration too (opt in knowingly)
```

- `"project"` carga `<projectDir>/.claude/settings.json`, sus skills y comandos, y los ficheros `CLAUDE.md` que se encuentran desde `projectDir` subiendo por el árbol de directorios.
- `[]` es lo más aislado: úsalo cuando el plugin del agente trae todo lo que necesita. También ahorra contexto (ya no se envían los CLAUDE.md de las carpetas superiores).

### Lo que no se puede desactivar {#what-cant-be-turned-off}

La CLI añade al contexto el nombre y el correo electrónico de la cuenta de Claude Code con la sesión iniciada (de `~/.claude.json`). Solo un `CLAUDE_CONFIG_DIR` aparte lo evita, lo que también traslada el inicio de sesión. Importa sobre todo para el idioma de las respuestas: consulta [Idiomas](../sessions/languages.md#limits).

## Variables de entorno {#environment-variables}

El subproceso de la CLI hereda el entorno de tu proceso. Define en el entorno las variables que necesitan tus herramientas, no en los prompts. Para dar al subproceso un entorno distinto, pasa `env` en las opciones:

```ts
const session: Options = { ...options, env: { ...process.env, HTTPS_PROXY: "http://proxy:8080" } };
```
