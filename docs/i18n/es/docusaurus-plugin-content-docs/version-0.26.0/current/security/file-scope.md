---
sidebar_position: 2
title: Ámbito de ficheros
description: Cómo el hook del ámbito de ficheros limita Read, Write, Edit, Grep y Glob a las carpetas propias del agente, con cada regla y su mensaje de denegación.
---

# Ámbito de ficheros

Sin él, las herramientas de ficheros del SDK pueden llegar a todo el directorio de trabajo, y mantener al agente fuera de tus propios ficheros dependería solo del prompt. La puerta (gate) del ámbito de ficheros es un hook `PreToolUse`, registrado siempre que la sesión tiene herramientas de ficheros, que comprueba cada llamada a `Read`, `Write`, `Edit`, `Grep` y `Glob` frente a las carpetas de la [configuración de la sesión](../core-concepts/session-config.md) y las de las [extensiones](../extensions/overview.md) con las que se ejecuta la sesión.

## El ámbito {#the-scope}

| Ámbito | Se construye a partir de |
| --- | --- |
| Escribible | `extraWritableDirs` |
| Buscable (`Grep`) | la carpeta de la extensión `sources`, `extraWritableDirs`, `extraReadableDirs` |
| Legible (`Read`, `Glob`) | las carpetas buscables, más lo que el kit sabe que el agente necesita: su carpeta de la ejecución, los plugins que carga, el `.claude/` del proyecto (con la fuente de configuración `"project"`) y los resultados grandes de herramientas del SDK (`~/.claude/projects/<project>/<session>/tool-results/`) |
| Solo lectura | la carpeta de la extensión `sources` (solo cambia la redacción de la denegación) |
| Denegado | `deniedPaths`, y siempre las credenciales del SDK (`~/.claude/.credentials.json`, o bajo `CLAUDE_CONFIG_DIR`) |
| Solo herramientas | las carpetas de las extensiones `knowledge` y `memory`, a las que solo se llega a través de sus propias herramientas |

Las rutas relativas se resuelven respecto a `projectDir`. Una ruta está dentro de una carpeta cuando es la propia carpeta o cualquier cosa que haya debajo (sin distinguir mayúsculas y minúsculas en Windows).

## Las reglas {#the-rules}

| Herramienta | Se permite cuando | Se deniega con |
| --- | --- | --- |
| `Read` | el fichero está dentro de una carpeta legible y no en una ruta denegada | denegado: `"<path>" is off limits: it can't be read.`; fuera de las carpetas legibles: `"<path>" can't be read: reading is only allowed inside sources/ and your own plugins and run folder.` |
| `Glob` | donde empieza (su `path` más las carpetas fijas del patrón) está dentro de una carpeta legible y no en una ruta denegada, y el patrón no tiene `..` | denegado: `"<path>" is off limits: it can't be listed.`; fuera: `Glob can't list "<path>": listing is only allowed inside sources/ and your own plugins and run folder.` |
| `Write`, `Edit` | el fichero está dentro de una carpeta escribible y no está denegado | carpeta de solo lectura: `"<path>" is read-only: originals are never modified — write your own notes inside drafts/ instead.`; en cualquier otro sitio: `"<path>" can't be written: writing is only allowed inside drafts/.` |
| `Grep` | su `path` (el directorio del proyecto si se omite) está dentro de una carpeta buscable, no está denegado y no contiene una ruta denegada | `Grep only searches inside sources/, drafts/ — pass one of them (or a folder inside) as "path".` |
| Cualquier herramienta de ficheros, en una carpeta de solo herramientas | nunca: `Read`, `Write`, `Edit` dentro de ella; `Grep` o `Glob` empezando dentro de ella o por encima (cuentan las carpetas fijas de un patrón de `Glob`: `sources/**` empieza en `sources/`) | `"<path>" is in knowledge/, which is reached only through the knowledge_* tools, not the file tools.` |
| Cualquier otra herramienta | siempre (aquí no se juzga) | |

Notas:

- **`Read` y `Glob` son una lista de permitidos, no de denegados**: una lista de denegados nunca nombra todos los secretos (`~/.ssh`, los `.env` de otros proyectos, perfiles del navegador, documentos con datos personales), y a un agente que lee contenido no confiable (páginas web, entregas, mensajes de foros) se le puede convencer para que lea un fichero y lo ponga en una respuesta. Consulta [Qué puede leer el agente](#what-the-agent-can-read).
- **`Grep` está acotado** porque imprime el contenido de los ficheros: un `Grep` por todo el proyecto podría filtrar las líneas de un fichero denegado. Por el mismo motivo, no se puede buscar en una carpeta que simplemente *contiene* un fichero denegado.
- **`Glob` lista nombres, no contenidos**, pero los nombres también pueden filtrar información (`grades_3B_<student>.xlsx`), así que sigue las reglas de `Read`.
- Una llamada sin ruta se deja para que la rechace la propia herramienta.
- Las reglas también se aplican a los subagentes: el hook se ejecuta en cada llamada de la sesión.

## Qué puede leer el agente {#what-the-agent-can-read}

`Read` y `Glob` funcionan como una lista de permitidos, igual que `Write` y `Grep`: el agente lee sus propias carpetas y nada más del disco. La amplías con `extraReadableDirs`:

```ts
const spec: AgentSpec<Config> = {
  // …
  extensions: [sources({ dir: "/work/course/sources" })], // read and searched, never written
};

const config: Config = {
  // …
  extraReadableDirs: ["/work/shared/rubrics"], // read and searched, never written
};
```

El kit añade lo que sabe que el agente necesita sin que tengas que declararlo: la carpeta de la ejecución, los plugins que carga, el `.claude/` del proyecto y los resultados grandes de herramientas del SDK, que los agentes leen con `Read` cuando una salida es demasiado grande para el contexto. `deniedPaths` sigue ganando dentro de todo ello, y por partida doble: el kit pasa también las rutas denegadas (y las credenciales del SDK) al SDK como sus propias reglas `permissions.deny`, `Read` y `Edit` para cada una y para todo lo que contenga, de modo que una herramienta de ficheros que el hook del kit no conozca tampoco pueda llegar a ellas. Una ruta absoluta se escribe en la forma POSIX `//` de las reglas (`C:\Users\ada\.env` es `//c/Users/ada/.env`). La propia carpeta del proyecto no es legible: lo demás que viva allí (un fichero de configuración con un token, un `.env`) queda fuera. A las carpetas de la base de conocimiento y de la memoria solo se sigue llegando a través de sus propias herramientas. Los subagentes pasan por el mismo hook.

`Bash`, cuando un subagente lo tiene, queda fuera de la puerta: puede llegar a cualquier ruta.

## Ejemplos {#examples}

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  // …
  extensions: [
    sources({ dir: (config) => path.join(config.projectDir, "sources") }),
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }),
  ],
};

const config: BaseSessionConfig = {
  mode: "guided",
  projectDir: "/work/course",
  extraWritableDirs: ["/work/course/drafts"],
  deniedPaths: ["/work/course/agent.config.json"],
};
```

| Llamada | Resultado |
| --- | --- |
| `Write knowledge/index.md` | denegada: a la carpeta de conocimiento solo se llega a través de las herramientas `knowledge_*` |
| `Edit drafts/newsletter.md` | permitida |
| `Edit sources/syllabus.pdf` | denegada: solo lectura |
| `Write README.md` | denegada: no es escribible |
| `Read sources/syllabus.md` | permitida |
| `Read README.md` | denegada: la raíz del proyecto no es legible |
| `Read agent.config.json` | denegada: prohibido |
| `Grep "exam" in sources/` | permitida |
| `Grep "exam"` (sin ruta) | denegada: la raíz del proyecto no es buscable |
| `Grep "password" in .` | denegada |

## Usarlo fuera de `buildSessionOptions()` {#using-it-outside-buildsessionoptions}

`createFileScopeGate(scope)` construye el hook, y `checkFileScope(scope, toolName, input)` da la decisión como una cadena (el motivo de la denegación) o `undefined`, útil para los tests:

```ts
import { checkFileScope, type FileScope } from "@falkenslab/agent-kit";

const scope: FileScope = {
  projectDir: "/work",
  writableDirs: ["/work/notes"],
  searchableDirs: ["/work/notes"],
  readOnlyDirs: [],
  deniedPaths: ["/work/.env"],
};

checkFileScope(scope, "Write", { file_path: "notes/a.md" }); // undefined: allowed
checkFileScope(scope, "Read", { file_path: ".env" }); // '".env" is off limits: it can't be read.'
```
