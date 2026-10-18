---
sidebar_position: 3
title: Configuración de la sesión
description: BaseSessionConfig, campo a campo, y cómo ampliarla con tus propios campos.
---

# Configuración de la sesión

`BaseSessionConfig` es lo mínimo que necesita una configuración para manejar `buildSessionOptions()`. Tu agente la amplía con lo que necesite su dominio; el kit solo lee sus propios campos y pasa el objeto entero a los métodos de tu [`AgentSpec`](agent-spec.md).

```ts
import type { BaseSessionConfig } from "@falkenslab/agent-kit";

interface Config extends BaseSessionConfig {
  courseUrl: string;
  password: string;
}
```

## Campos {#fields}

| Campo | Tipo | Obligatorio | Qué hace |
| --- | --- | --- | --- |
| `mode` | `"interactive" \| "guided" \| "autonomous" \| "plan"` | sí | Cuánto participa una persona en el bucle. Consulta [Modos](modes.md). |
| `projectDir` | `string` | sí | La raíz del proyecto: el directorio de trabajo de la sesión cuando el agente tiene herramientas de ficheros o plugins, y la base de las rutas relativas del ámbito de ficheros. |
| `officialMarketplace` | `string` | no | El [marketplace](../extensions/installing.md#marketplaces) propio del agente (una carpeta o una URL de git, `#ref`): el [catálogo](../extensions/installing.md#the-catalog) de los chats ofrece lo que contiene, que se instala sin confirmación. Lo mismo que `official` de `runExtensionCommand()`. |
| `catalogTopics` | `string[]` | no | Los temas de las extensiones que este agente ofrece a sus usuarios (`["miyagi"]`): el [catálogo](../extensions/installing.md#the-catalog) de los chats muestra solo las que tienen alguno de ellos. Sin él, todas. |
| `extensionDirs` | `{ agent?: string; project?: string }` | no | Dónde se [instalan las extensiones](../extensions/installing.md) de este agente: `agent` para todos sus proyectos, `project` para este (que tiene prioridad). Las activadas cuyos ficheros coinciden con su lock se ejecutan con la sesión. |
| `extraWritableDirs` | `string[]` | no | Carpetas que el agente lee, en las que busca y en las que escribe con las herramientas de ficheros (las cinco), p. ej. una carpeta con sus propias notas. |
| `extraReadableDirs` | `string[]` | no | Más carpetas que el agente puede leer y en las que puede buscar (`Read`, `Glob`, `Grep`), nunca escribir. Aparte de ellas, de `extraWritableDirs` y de las carpetas de sus extensiones (las fuentes), el agente no lee nada del disco (consulta [Qué puede leer el agente](../security/file-scope.md#what-the-agent-can-read)). |
| `deniedPaths` | `string[]` | no | Ficheros o carpetas que el agente nunca debe leer, en los que nunca debe buscar ni escribir, p. ej. un fichero de configuración que guarda una contraseña. |
| `secrets` | `string[]` | no | Valores que se borran del registro de la transcripción, p. ej. una contraseña. |
| `language` | `string` | no | El idioma de los textos del kit y de las respuestas del agente (`"en"`, `"es"`, `"fr"`, `"de"`). `--language` en la línea de comandos tiene prioridad sobre él. |
| `timeZone` | `string` | no | La zona horaria IANA (`"Europe/Madrid"`) en la que responden las [herramientas de fecha y hora](../capabilities/tools-and-mcp.md#date-and-time); la del sistema si no se indica. |

## Ejemplos {#examples}

### Un chat sin ficheros {#a-chat-with-no-files}

```ts
const config: BaseSessionConfig = { mode: "autonomous", projectDir: process.cwd() };
```

Sin carpetas (y sin ninguna extensión que pida herramientas de ficheros): el agente no recibe ninguna herramienta de ficheros.

### Notas y originales {#notes-and-originals}

Las carpetas de las extensiones del kit son sus opciones, en la spec, a menudo calculadas a partir del `projectDir` de la configuración:

```ts
const workspace = path.resolve(process.argv[2] ?? ".");

const config: BaseSessionConfig = { mode: "guided", projectDir: workspace };

const spec: AgentSpec<BaseSessionConfig> = {
  // …
  extensions: [
    sources({ dir: (config) => path.join(config.projectDir, "sources") }),
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }),
  ],
};
```

El agente guarda sus notas en `knowledge/` solo a través de las herramientas `knowledge_*`, lee `sources/` y busca en ella, y solo añade cosas a `sources/` mediante las herramientas de las fuentes (`save_to_sources`, `download_to_sources`, `request_file`). Consulta [Extensiones](../extensions/overview.md).

### Proteger un secreto {#protecting-a-secret}

```ts
interface Config extends BaseSessionConfig {
  password: string;
}

const configFile = path.join(workspace, "agent.config.json");
const { password } = JSON.parse(await readFile(configFile, "utf8"));

const config: Config = {
  mode: "guided",
  projectDir: workspace,
  extraReadableDirs: [workspace],
  deniedPaths: [configFile], // never readable, searchable or writable
  secrets: [password], // never written to transcript.jsonl in clear
  password,
};
```

`deniedPaths` lo hace cumplir el [hook del ámbito de ficheros](../security/file-scope.md); `secrets`, el [registro de la transcripción](../security/transcript.md). Usa los dos: uno impide que el agente lea el fichero y el otro mantiene el valor fuera del registro si alguna vez llega por otra vía a una llamada a herramienta (el agente escribiéndolo en un formulario de inicio de sesión, por ejemplo).

### Carpetas adicionales con escritura {#extra-writable-folders}

```ts
const config: BaseSessionConfig = {
  mode: "guided",
  projectDir: workspace,
  extraWritableDirs: [path.join(workspace, "notes"), path.join(workspace, "drafts")],
};
```

### Forzar un idioma {#forcing-a-language}

```ts
const config: BaseSessionConfig = { mode: "guided", projectDir: workspace, language: "fr" };
```

La persona que ejecuta el agente aún puede cambiarlo con `--language=de`. Consulta [Idiomas](../sessions/languages.md).

:::tip El modo no es "chat o ejecución de una sola vez"
`mode` solo tiene que ver con la supervisión. Que una sesión sea un chat de varios turnos o una ejecución de una sola vez depende de cómo la arranques (`runChatInk()` o `runQuery()` con una cadena). Si tu agente necesita saber que está en un chat (para elegir otro prompt, por ejemplo), añade tu propio campo a la configuración.
:::
