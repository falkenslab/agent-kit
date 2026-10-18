---
sidebar_position: 9
title: Referencia del manifiesto
description: Todos los campos que pueden llevar los ficheros de una extensión instalada (los campos de Claude Code de plugin.json, las opciones de userConfig, metadata["agent-kit"], las sustituciones de .mcp.json, las fuentes de un marketplace), el lock, dónde guarda las cosas el kit, los esquemas y por qué una extensión está apagada.
---

# Referencia del manifiesto

## plugin.json {#pluginjson}

`.claude-plugin/plugin.json`, en el [formato de Claude Code](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema). Los campos que lee el kit:

| Campo | Qué es |
| --- | --- |
| `name` | En kebab-case. Su nombre en el agente: sus herramientas son `mcp__<server>__<tool>`, y sus skills y comandos, `<name>:<…>`. |
| `version` | Su versión: se muestra, se compara para las actualizaciones y es la misma que la de su entrada del marketplace. |
| `description` | Una frase; la muestran la sección Extensions del prompt y el catálogo. |
| `author` | `{ name, email?, url? }` (un objeto: una cadena no pasa la validación). |
| `homepage`, `repository`, `license` | Los muestra `extension info`; `repository` puede ser una URL o `{ url }`. |
| `keywords` | Sus topics en un catálogo. |
| `userConfig` | Sus opciones ([más abajo](#userconfig)). |
| `mcpServers` | Sus servidores MCP en línea, o la ruta a un fichero JSON; si no, `.mcp.json` en su raíz. |
| `metadata` | Datos libres que Claude Code no lee: los de agent-kit van en `"agent-kit"` ([más abajo](#metadataagent-kit)). |

Las skills (`skills/<name>/SKILL.md`), los comandos (`commands/<name>.md`) y los subagentes (`agents/<name>.md`) se cargan como en Claude Code. Sus hooks nunca se ejecutan en el kit.

## userConfig {#userconfig}

Cada clave (letras, dígitos y `_`) es una opción; en el formato de Claude Code, estricto: cualquier otro campo deja la extensión apagada, igual que Claude Code la rechaza.

| Campo | Qué es |
| --- | --- |
| `type` | `string`, `number`, `boolean`, `directory` o `file`. Obligatorio. |
| `title` | Cómo se llama donde se le pregunta a la persona. |
| `description` | Qué es, para la persona. Obligatorio. |
| `required` | Sin valor (ni valor por defecto), la extensión está apagada. |
| `default` | Su valor hasta que la persona dé uno. |
| `sensitive` | Un secreto: se pregunta sin eco, se guarda aparte, nunca se vuelve a mostrar y nunca se establece desde un chat. |
| `options` | Los valores que puede tomar (un `string`; no con `multiple` ni `sensitive`). Necesita Claude Code 2.1.271 o posterior. |
| `multiple` | Varios valores, separados por comas donde se escriben, unidos con comas para el servidor. |
| `min`, `max` | Los límites de un número. |

## metadata["agent-kit"] {#metadataagent-kit}

Todo opcional; lo comprueba `schemas/agent-kit-metadata.schema.json`.

| Campo | Qué hace |
| --- | --- |
| `kit` | Las versiones de agent-kit con las que funciona: comparadores separados por espacios, que deben cumplirse todos (`>=0.22.0`, `>=0.22.0 <0.24.0`, `0.22.1`). Fuera de ellas, está apagada. No pongas un límite superior salvo que se sepa que una versión la rompe. |
| `description` | Su descripción en otros idiomas: `{ "es": "…", "fr": "…", "de": "…" }`. El inglés es la propia `description` de `plugin.json`; donde falta el idioma de la persona, esta lee la inglesa. |
| `provides`, `requires` | Sus [capacidades](overview.md#capabilities), por nombre. |
| `capabilities` | Lo que permite hacer al agente, para la persona: una lista de `{ id, skills, tools, texts }`. `id` va en kebab-case y cuenta como proporcionado; `skills` son carpetas de su `skills/` (cada una debe existir), `tools` nombres cortos de cualquiera de sus servidores; `texts` da una `label` (obligatoria) y una `description` por idioma (`en`, `es`, `fr`, `de`), con el inglés donde falte el de la persona. |
| `requirements` | [Programas que necesita](writing.md#programs-it-needs) en el ordenador, que instala la persona: una lista de `{ name, program, version?, install, for? }`. `program` es un nombre sin más en el `PATH`; `version` es `{ args, min }`, con argumentos que solo pueden ser opciones o `version`; `install` tiene un comando por sistema (`windows`, `macos`, `linux`) y una `url`; `for` nombra las capacidades que lo necesitan (ninguna: toda la extensión). Si falta, toda la extensión o esas capacidades están apagadas, diciendo cómo instalarlo. |
| `readOnlyTools` | Sus herramientas que solo leen (nombres cortos, de cualquiera de sus servidores): el modo plan las deja pasar. Sin él, el modo plan pregunta a sus servidores (`readOnlyHint`); con él, la lista es la respuesta completa, aunque esté vacía. |
| `labels` | Cómo muestra el chat cada herramienta (nombre corto), por idioma (`en`, `es`, `fr`, `de`; inglés cuando no está el del kit): `label`, con `{field}` tomando la entrada de la llamada, y `phrase`, `[once, "{n} times"]`, para un [resumen plegado](../terminal-ui/tool-labels.md#folded-summaries). |
| `help` | Lo que dice de sí misma en una sesión, para que el agente se lo cuente a la persona. |
| `catalog` | Su aspecto: `logo` (cuadrado) y `banner` (ancho), SVG, PNG, JPEG o WebP, rutas dentro de su carpeta. |

## .mcp.json {#mcpjson}

Tal como lo lee Claude Code (o en `mcpServers` dentro de `plugin.json`), con o sin la clave `mcpServers`. Cada servidor: `command` (`node`, o `npx` con `-y` y `<package>@<x.y.z>`), `args`, `env`. En `args` y `env`:

| Marcador | Se convierte en |
| --- | --- |
| `${CLAUDE_PLUGIN_ROOT}` | La carpeta de la extensión, esté donde esté instalada. También se le da al servidor como variable. |
| `${CLAUDE_PLUGIN_DATA}` | Su [carpeta de datos](writing.md#its-data). También se da como variable. |
| `${user_config.KEY}` | El valor de una de sus opciones, leído cuando arranca el servidor. |
| `${VAR}` | La variable de entorno propia del agente. |

## Fuentes de un marketplace {#marketplace-sources}

El `source` de una entrada en `.claude-plugin/marketplace.json`, tal como los tiene Claude Code; el kit instala:

| `source` | Desde |
| --- | --- |
| `"./path"`, o un nombre sin más bajo `metadata.pluginRoot` | Una carpeta del propio marketplace; una que sale de él (`..`) se rechaza. |
| `{ "source": "github", "repo": "owner/repo", "ref"?, "sha"? }` | Un repositorio de GitHub, en una rama o etiqueta, o en un commit fijado. |
| `{ "source": "url", "url": "…git", "ref"?, "sha"? }` | Cualquier repositorio git. |
| `{ "source": "git-subdir", "url": "…", "path": "…", "ref"?, "sha"? }` | Una carpeta de un repositorio git. |
| `{ "source": "npm", "package": "@scope/name", "version"?, "registry"? }` | Un paquete de npm que es la extensión: la versión pedida (exacta, una dist-tag, `latest` por defecto, o un rango), con su tarball comprobado contra la `integrity` del registro. |
| `{ "source": "archive", "url": "https://….zip", "sha256"? }` | Un zip por HTTPS, comprobado contra `sha256` cuando se da; la extensión es su raíz, o su única carpeta. |

Las descargas de npm y zip se descargan y desempaquetan en el propio proceso del agente (sin npm, sin `tar`; desempaquetar usa la biblioteca opcional `fflate`, consulta [Instalación](../getting-started/installation.md#optional-libraries)), y no se ejecuta nada de ellas. Las fuentes `command` nunca se instalan: ejecutarían un programa del marketplace en el ordenador de la persona.

## El lock {#the-lock}

`extensions.lock.json` en cada ámbito, por nombre de extensión:

| Campo | Qué es |
| --- | --- |
| `source` | De dónde vino: una carpeta, una URL de git (`#ref`), `npm:<package>@<version>`, la URL de un zip. Una enlazada se ejecuta desde ahí. |
| `commit`, `subdir` | El commit en el que se clonó una fuente git, y la carpeta dentro de ella. |
| `marketplace` | `<name>@<marketplace>`, cuando vino de uno. |
| `sha256` | Un hash de sus ficheros (sin contar los finales de línea de los ficheros de texto), comprobado antes de cada sesión; vacío para una enlazada. |
| `linked` | Registrada donde está (`--link`), sin comprobar sus ficheros. |
| `stored` | Su código está en el almacén del agente (si es de un workspace): `<agent>/.store/<name>/<hash>/`. |
| `packages` | Los paquetes de npm que ejecutan sus servidores npx: la integridad, el hash y el `bin` de cada uno. |
| `options` | Los valores de sus opciones que no son secretos. |
| `enabled`, `installed` | Activada o desactivada; cuándo se instaló. |

## Dónde guarda las cosas el kit {#where-the-kit-keeps-things}

| Ruta | Qué |
| --- | --- |
| `<scope>/extensions.lock.json` | El lock del ámbito. |
| `<scope>/<name>/` | El código de una extensión, en el ámbito del agente (o en el de un proyecto, cuando el agente no tiene ámbito propio). |
| `<scope>/.data/<name>/` | Sus datos (`${CLAUDE_PLUGIN_DATA}`). |
| `<scope>/.secrets/<name>.json` | Sus secretos; denegados a las herramientas de ficheros de la sesión. |
| `<agent>/.store/<name>/<hash>/` | El código de las extensiones de un workspace, por contenido. |
| `<agent>/.projects/<project>-<hash>/` | Los datos y secretos de un workspace. |
| `<agent>/.npm/<package>/<version>/` | Los paquetes de npm que ejecutan los servidores npx. |
| `<agent>/marketplaces.json`, `<agent>/.marketplaces/<name>/` | Los marketplaces conocidos y sus copias. |
| `<agent>/.trust.json` | En qué confía la persona, por workspace. |
| `<runDir>/extensions/<name>/` | El enlace de una sesión al plugin de una extensión. |

## Esquemas {#schemas}

Distribuidos en `@falkenslab/agent-kit`, en `schemas/`:

- `agent-kit-metadata.schema.json`: `metadata["agent-kit"]` en un `plugin.json`.
- `marketplace-catalog.schema.json`: el `catalog.json` de un marketplace.

## Por qué una extensión está apagada {#why-an-extension-is-off}

Una extensión activada no se ejecuta, y el prompt y `/extensions` dicen por qué, cuando:

- sus ficheros han cambiado desde que se instaló (su hash no coincide): vuelve a instalarla para confiar en el cambio;
- viene con un workspace y aún no se confía en ella ahí, o su código aún no está en este ordenador ([Workspaces](workspaces.md));
- su rango `kit` excluye el kit de este agente;
- un programa que [requiere](writing.md#programs-it-needs) para toda la extensión no está en el `PATH`, o es más antiguo que su `min` (uno que solo necesitan algunas capacidades deja apagadas esas en su lugar, y la extensión se ejecuta);
- un requisito no se puede comprobar de forma segura (un programa dado como ruta, un argumento de versión que no es una opción) o es para una capacidad que no proporciona;
- un servidor no es de Node ni de npx con una versión exacta, no tiene script donde dice, o su paquete de npx no está en la caché;
- un servidor nombra un `${user_config.KEY}` que su `userConfig` no declara, o una opción obligatoria no tiene valor;
- su `userConfig` tiene una opción con un campo desconocido;
- una capacidad nombra una skill que no tiene, o dos tienen el mismo id;
- requiere una capacidad que ninguna extensión activada proporciona;
- una extensión que activa el spec tiene su nombre.
