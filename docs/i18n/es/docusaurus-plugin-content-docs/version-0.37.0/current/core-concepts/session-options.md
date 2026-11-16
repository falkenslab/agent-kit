---
sidebar_position: 5
title: Opciones de la sesión
description: Qué construye exactamente buildSessionOptions(), opción a opción, y qué devuelve.
---

# Opciones de la sesión

```ts
function buildSessionOptions<TConfig extends BaseSessionConfig>(
  config: TConfig,
  runDir: string,
  spec: AgentSpec<TConfig>,
  options?: { autoCompactEnabled?: boolean; run?: RunFolder },
): Promise<{
  options: Options; // for the SDK's query()
  transcriptLogger: TranscriptLogger;
  transcriptPath: string; // <runDir>/transcript.jsonl
  modeControl: ModeControl;
  language: Language; // the resolved language
}>;
```

- **`config`**: tu [configuración de la sesión](session-config.md).
- **`runDir`**: la carpeta de esta ejecución. La usan la transcripción, el fichero de respuesta y los servidores MCP del kit. Con una carpeta de ejecuciones, pasa la carpeta que el chat le da a tu abridor (`run.dir`).
- **`spec`**: tu [`AgentSpec`](agent-spec.md).
- **`options.autoCompactEnabled`**: la compactación automática del contexto del SDK; `true` por defecto.
- **`options.run`**: guarda la transcripción del SDK en la carpeta de la ejecución y reanuda su sesión si tiene una. Consulta [Ejecuciones y reanudación](../sessions/runs-and-resuming.md).

## Qué entra en `Options` {#what-goes-into-options}

### Prompt del sistema {#system-prompt}

`spec.buildSystemPrompt(config)`, después la lista de las [extensiones](../extensions/overview.md) y la sección propia de cada una que esté activa (el "Who you are" de awareness, la de las fuentes, la de la base de conocimiento), y después la [línea del idioma de respuesta](../sessions/languages.md), salvo que `spec.replyInLanguage === false`.

### Herramientas {#tools}

`tools` (lo que existe) y `allowedTools` (lo que está preaprobado) son la misma lista, construida a partir de la configuración:

| Condición | Herramientas añadidas |
| --- | --- |
| siempre | `WebFetch`, `WebSearch`, `TodoWrite` |
| `config.extraWritableDirs` | `Read`, `Write`, `Edit`, `Glob`, `Grep` |
| `config.extraReadableDirs`, o una extensión que las pida (`sources`) | `Read`, `Glob`, `Grep` |
| herramientas de ficheros o al menos un plugin | `Skill` |
| `spec.buildSubagents()` devuelve algo | `Agent`; también `Bash` cuando un subagente la incluye en sus `tools` o no tiene `tools` |

`TodoWrite` es la lista de tareas del SDK para trabajos largos (el `env` de la sesión es `process.env` más `CLAUDE_CODE_ENABLE_TASKS=0`, sin lo cual el CLI la sustituye por sus propias herramientas Task): los chats muestran la lista en lugar de las llamadas (consulta [Chat Ink](../terminal-ui/ink-chat.md#whats-on-screen)). No hay disponible ninguna otra de las herramientas integradas del CLI. `Bash` está ahí solo porque el SDK no lanza un subagente cuyas herramientas no estén entre las de la sesión; un hook se la deniega al agente principal.

### Servidores MCP y permisos {#mcp-servers-and-permissions}

`mcpServers` contiene `spec.buildMcpServers(config, runDir)` más los propios del kit, cuando corresponden:

| Servidor | Herramienta | Cuándo |
| --- | --- | --- |
| `approvals` | `request_human_approval`, `ask_human`, `present_plan` | el modo no es `autonomous` |
| `manualLogin` | `request_manual_login` | el modo no es `autonomous` y `spec.manualInterventionTexts` está definido |
| `sourceFiles` | `list_sources`, `extract_text`, `save_to_sources`, `download_to_sources`, y `request_file`, `retire_source` fuera del modo autónomo | la extensión `sources` (con su carpeta) |
| `time` | `current_time`, `date_math` | siempre (en `config.timeZone`, o en la del sistema) |
| `knowledge` | las herramientas `knowledge_*` (`knowledge_retire` fuera del modo autónomo) | la extensión `knowledge` (con su carpeta) |

`canUseTool` es `allowAnyMcpTool`: se aprueba cada llamada `mcp__*` y se deniega todo lo demás (las herramientas integradas de arriba ya están preaprobadas, así que nunca llegan ahí). `disallowedTools` es `spec.disallowedTools ?? []` y tiene prioridad sobre todo.

### Hooks {#hooks}

`PreToolUse`, en este orden:

1. el [registro de la transcripción](../security/transcript.md);
2. la [puerta del ámbito de ficheros](../security/file-scope.md), con herramientas de ficheros;
3. la [puerta de pasos](../human-in-the-loop/step-gate.md), fuera del modo autónomo, activa solo mientras el modo es `interactive`;
4. la puerta del plan, también fuera del modo autónomo, activa solo mientras el modo es `plan` (consulta [modos](./modes.md#plan));
5. con subagentes, las tres [puertas de los subagentes](../security/subagent-gates.md): tipo, Bash, primer plano.

`PostToolUse`: el registro de la transcripción.

El resultado también tiene `apis`, lo que cada extensión activa le entrega al host, por su nombre: el `addSource` de las fuentes en `apis.sources.addSource`, el almacén de la base de conocimiento en `apis.knowledge.knowledgeStore` (consulta [Almacén de conocimiento](../capabilities/knowledge-store.md)).

### Skills, plugins y el directorio de trabajo {#skills-plugins-and-the-working-directory}

Cuando la sesión tiene herramientas de ficheros o al menos un plugin:

- `cwd` es `config.projectDir`;
- `additionalDirectories` son las carpetas en las que se puede buscar: las de solo lectura de las extensiones (la carpeta de fuentes), luego `extraWritableDirs` y luego `extraReadableDirs`;
- `plugins` son `spec.pluginRoots(config)`, más el plugin de conocimiento cuando la base de conocimiento está activada, cada uno cargado como plugin local sin su descubrimiento de MCP;
- `skills` es `spec.skills ?? "all"`; `"plugins"` se convierte en las skills de los plugins cargados (`plugin:folder`), y a una lista se le añaden las skills de las extensiones activadas.

En otro caso se aplican los valores por defecto del SDK (el directorio de trabajo del proceso, sin plugins).

### Ajustes {#settings}

| Opción | Valor | Por qué |
| --- | --- | --- |
| `settingSources` | `spec.settingSources ?? ["project"]` | los ajustes de Claude Code de quien ejecuta el agente nunca le llegan al agente salvo que se pidan |
| `settings.autoCompactEnabled` | `options.autoCompactEnabled ?? true` | los chats largos siguen funcionando |
| `settings.autoMemoryEnabled` | `false` | la memoria de Claude Code de quien ejecuta el agente no es la del agente |
| `settings.includeGitInstructions` | `false` | ningún agente del kit hace commits de código, y el contexto de git desviaba el idioma de respuesta |
| `settings.disableClaudeAiConnectors` | `true` | los conectores de claude.ai de la cuenta con la que se ejecuta la sesión (Drive, Gmail…) son integraciones de quien ejecuta el agente, no del agente |
| `includePartialMessages` | `true` | las respuestas llegan token a token |
| `maxTurns` | `400` | un límite generoso por consulta |

Consulta [Permisos y aislamiento](../security/permissions-and-isolation.md) para conocer los motivos.

### Subagentes {#subagents}

`agents` es lo que devolvió `spec.buildSubagents(config)`, con la línea del idioma de respuesta añadida al prompt de cada subagente.

### Ejecuciones {#runs}

Con `options.run`: `sessionStore` es un [almacén de ejecuciones](../sessions/runs-and-resuming.md) para `run.dir`, y `resume` es `run.sessionId` cuando tiene uno.

## Añadir tus propias opciones {#adding-your-own-options}

El resultado es un objeto plano: expándelo para añadir o sobrescribir cualquier cosa que el kit no defina por ti.

```ts
const { options } = await buildSessionOptions(config, runDir, spec);

const session: Options = {
  ...options,
  model: "claude-sonnet-5",
  maxTurns: 50,
  hooks: {
    ...options.hooks,
    PostToolUse: [...(options.hooks?.PostToolUse ?? []), { hooks: [myAuditHook] }],
  },
};
```

Conserva los hooks del kit cuando añadas los tuyos: sustituir `hooks` por completo eliminaría todas las salvaguardas. Consulta [Tus propios hooks](../advanced/hooks.md).

## Llamarla más de una vez {#calling-it-more-than-once}

Cada llamada construye un conjunto nuevo de servidores y hooks ligado a su `runDir`. Construye las opciones una vez por sesión, y otra vez para otra carpeta de ejecución (es lo que hace un abridor de sesión con `/resume`). El idioma resuelto, el control de modo y el registro de la transcripción pertenecen a esa llamada.
