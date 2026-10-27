---
sidebar_position: 3
title: Instalación y catálogo
description: Dónde instala extensiones un agente (sus ámbitos y sus locks), el comando extension, los marketplaces y su confianza, el catálogo en los chats (topics, logos, catalogTopics, el marketplace oficial), /extensions, y activar y desactivar extensiones en una sesión en marcha.
---

# Instalación y catálogo

Esta página es para quien construye un agente y deja que sus usuarios instalen extensiones, y para esos usuarios. Las extensiones en sí se escriben como en [Escribir una](writing.md).

## Ámbitos {#scopes}

Un agente dice dónde se le instalan las extensiones, en dos **ámbitos**, como los plugins de Claude Code:

```ts
const config: Config = {
  // …
  extensionDirs: {
    agent: path.join(os.homedir(), ".my-agent", "extensions"), // for all its projects
    project: path.join(projectDir, "extensions"), // for this one: it wins over the agent's
  },
  officialMarketplace: "falkenslab/agent-extensions", // optional: its own marketplace
  catalogTopics: ["my-agent"], // optional: what its catalog offers
};
```

Cada ámbito tiene un lock, `extensions.lock.json`: de dónde vino cada extensión (una carpeta, una URL de git y el commit en el que se clonó, un marketplace), un SHA-256 de sus ficheros, si está activada y sus opciones. El ámbito del agente guarda el código de cada una en una subcarpeta propia; el de un proyecto guarda solo su lock (consulta [Workspaces](workspaces.md)). Cualquiera de los dos ámbitos puede omitirse: un agente cuya carpeta personal es su único proyecto (Captain Whiskers) solo tiene `agent`.

Cada una activada se ejecuta con la sesión, junto a las internas y resuelta de la misma forma ([capacidades](overview.md#capabilities), la sección Extensions del prompt), salvo que algo la mantenga apagada; el prompt y `/extensions` dicen por qué. Los motivos están en la [referencia](reference.md#why-an-extension-is-off).

## El comando {#the-command}

Cada agente expone el comando del kit en su propio binario, para que la persona no necesite conocer el kit:

```ts
import { runExtensionCommand } from "@falkenslab/agent-kit";

// Before anything else: `my-agent extension add …` does that and exits.
if (await runExtensionCommand(process.argv.slice(2), { dirs: extensionDirs, command: "my-agent", official: officialMarketplace, catalogTopics: ["my-agent"] })) process.exit();
```

`official` (el [marketplace](#marketplaces) propio del agente) y `catalogTopics` (lo que ofrece `search`) son opcionales.

| Comando | Qué hace |
| --- | --- |
| `extension list` | Lo que está instalado: nombre y versión, ámbito, si está activada o no, autor, de dónde viene. |
| `extension info <name>` | Todo lo que dice su manifiesto (descripción, autor, licencia, página web, repositorio, palabras clave, las versiones de agent-kit, capacidades, servidores, herramientas de solo lectura, opciones, paquetes, variables), cómo se instaló, su carpeta de datos y su tamaño, y dónde está su README. |
| `extension add <folder>` | Copia la carpeta en el ámbito del agente, comprueba su manifiesto, calcula su hash y la fija en el lock, activada. Dice lo que [necesita](writing.md#programs-it-needs) y le falta a este ordenador, y cómo instalarlo; nunca instala un programa. |
| `extension add <git URL>[#ref] [--path <subfolder>]` | Clona el repositorio en la ref (`https://…`, `git@…`, `file://…`, `github:owner/repo`) y registra el commit. No hace falta Git: el kit clona por HTTPS por su cuenta, así que funciona en una aplicación de escritorio en un ordenador sin Git; solo una dirección SSH (`git@…`, `ssh://`) necesita el programa `git`. |
| `extension add <name>[@<marketplace>]` | Instala una extensión de un [marketplace](#marketplaces) conocido, desde donde diga el marketplace; `@<marketplace>` solo cuando dos ofrecen ese nombre. Una de un marketplace que no es el propio del agente pregunta antes. |
| `extension add <folder> --link` | Registra la carpeta donde está, para [desarrollarla](developing.md): no se copia ni se comprueban sus ficheros. `list` la muestra como enlazada. |
| `extension add … --project` | En el ámbito del proyecto en su lugar (su código va al almacén del agente: consulta [Workspaces](workspaces.md)). |
| `extension add … --set <key>=<value>` | Da una de sus [opciones](configuring.md) (tantos `--set` como haga falta), que se guardan antes de preguntar nada más. Las que no se dan se preguntan en un terminal; con `--yes`, o sin terminal, no se pregunta ninguna: un valor por defecto se queda, una opcional queda sin valor y una obligatoria deja la extensión apagada hasta que se le dé (`extension config`). |
| `extension remove <name>` | La elimina junto con su entrada del lock (la carpeta de una enlazada se queda donde está). Cuando tiene [datos](writing.md#its-data), pregunta si borrarlos también: `--yes` los borra, `--keep-data` los conserva. |
| `extension enable <name>` | La activa. |
| `extension disable <name>` | La desactiva, manteniéndola instalada. |
| `extension config <name>` | Sus [opciones](configuring.md) y sus valores (de un secreto solo dice si está establecido). |
| `extension config <name> <key>=<value>…` | Las establece. `<key>` solo pregunta su valor, sin eco para un secreto (así no queda en el historial del shell); `--unset <key>` borra una. |
| `extension config <name> confirm=on\|off\|reset` | Si el modo guiado pregunta antes de sus herramientas que cambian cosas (`off`: funcionan sin preguntar), o `reset` para olvidar las respuestas guardadas ("siempre", "nunca"). Mira [Las respuestas del modo guiado](configuring.md#guided-modes-answers). |
| `extension update [name]` | Actualiza una instalada desde un marketplace a la versión que ofrece ahora (antes, una copia nueva del marketplace), o, sin nombre, todas las que tienen una versión más nueva; sus datos y opciones se conservan. Una instalada desde una carpeta o un repositorio se actualiza volviendo a añadirla. |
| `extension restore [--trust]` | Obtiene el código que lista el lock de un workspace y que le falta a este ordenador ([Workspaces](workspaces.md)); `--trust` además confía en él. |
| `extension trust [name…]` | Deja que se ejecuten las extensiones del workspace (o las nombradas), tal como está ahora su código. |
| `extension search [words]` | Lo que ofrecen los marketplaces conocidos (solo los de `catalogTopics` cuando se indican), buscando las palabras en un nombre, una descripción o un topic; las instaladas aparecen marcadas, con su actualización cuando la hay. |
| `extension marketplace add <folder \| git URL[#ref] \| owner/repo>` | Añade un marketplace tras un aviso y tras escribir su nombre (`--yes` para un script). |
| `extension marketplace list` | Los marketplaces conocidos: el oficial marcado, cuántas extensiones ofrece cada uno, de dónde viene y cuándo se copió. |
| `extension marketplace update [name]` | Toma una copia nueva de uno, o de todos; las extensiones instaladas se quedan como están hasta que se actualicen. |
| `extension marketplace remove <name>` | Lo olvida; las extensiones instaladas desde él se quedan. |

Sin un ámbito, `remove`, `enable` y `disable` actúan donde está la extensión (si está en ambos, indica cuál, `--project` o `--agent`). Instalar nunca ejecuta un script: los scripts de instalación de un repositorio, si los hay, no se ejecutan. `--yes` responde a las preguntas del comando; sin un terminal, se responden que no. `--help` (o `-h`) tras una acción muestra su uso y no hace nada más, y una opción que la acción no acepta la hace fallar, nombrando la opción, antes de cambiar nada.

## Marketplaces {#marketplaces}

Un repositorio de extensiones es un [marketplace de Claude Code](https://code.claude.com/docs/en/plugins/marketplace-reference) tal cual: una carpeta o un repositorio git con `.claude-plugin/marketplace.json`, que lista sus extensiones y de dónde viene cada una. El mismo fichero sirve a Claude Code y a los agentes basados en el kit. Cómo crear uno está en [Publicar un marketplace](publishing.md); las fuentes que puede nombrar una entrada están en la [referencia](reference.md#marketplace-sources).

Un agente conoce los marketplaces que se le han añadido, en su ámbito del agente (el del proyecto cuando no tiene): `marketplaces.json`, y una copia de cada uno en `.marketplaces/<name>/`. Instalar desde uno pasa por la misma copia, hash y lock que cualquier extensión, con su nombre registrado ahí (`weather@ada`, que muestra `extension list`). La confianza sigue el [ADR-025](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-025-extensions.md):

- **El marketplace propio del agente** (`official` en el comando, `officialMarketplace` en la configuración) se conoce sin preguntar, y sus extensiones se instalan sin preguntar. Si es una carpeta, se copia de nuevo cada vez que se consulta, ya que es código propio del agente; uno de git se copia una vez y se refresca con `marketplace update`.
- **Cualquier otro** solo se añade a mano: el comando muestra su nombre, su propietario y cuántas extensiones ofrece, avisa de que se ejecutan con los permisos de la persona y pide escribir su nombre. Instalar desde él muestra la extensión y vuelve a preguntar.

Las funciones detrás del comando también se exportan, para un host con su propia interfaz: `addMarketplace()`, `inspectMarketplace()` (leer uno sin añadirlo), `listMarketplaces()`, `updateMarketplace()`, `removeMarketplace()`, `findPlugin()`, `installFromMarketplace()`, y las del catálogo `extensionCatalog()`, `installExtension()` y `updateExtension()`. No preguntan nada: preguntar a la persona es cosa del host.

## El catálogo {#the-catalog}

Lo que ofrecen los marketplaces del agente es su catálogo, en el comando (`search`, `add`, `update`) y en los chats, así que una persona sin shell (una app de escritorio) también instala y actualiza extensiones.

- **Lo que lista**: cada extensión con su descripción en el idioma del kit (la suya en ese idioma, si no la inglesa), la versión que ofrece (la de su `plugin.json`, que prevalece sobre la entrada del marketplace, como en Claude Code), si está instalada, si una instalada desde ese marketplace tiene allí una versión más nueva, sus **topics**, su **aspecto**, lo que permite hacer al agente (sus [capacidades](overview.md#capabilities), en el idioma del kit, que la búsqueda también tiene en cuenta) y los programas que [necesita](writing.md#programs-it-needs) en el ordenador ("Needs Docker") y los hosts con los que hablan sus [servidores remotos](writing.md#a-remote-server).
- **Topics**: de qué trata y para quién es, a partir de los campos propios de Claude Code: los `keywords` de su `plugin.json`, y los `tags`, `keywords` y `category` de su entrada en el marketplace, en minúsculas. Un público es un topic como cualquier otro (`"miyagi"`), y la búsqueda también tiene en cuenta los topics.
- **Lo que ofrece un agente**: `catalogTopics` en su configuración limita el catálogo de sus chats, y `extension search`, a las extensiones con alguno de ellos; sin él, todas. Lo que ya está instalado se lista sean cuales sean sus topics, y se actualiza igual.
- **Su aspecto**: un `logo` (cuadrado) y un `banner` (ancho), que declara la extensión ([Escribir una](writing.md#6-its-look-in-a-catalog)). El catálogo los da como ficheros de la copia del marketplace; un host los sirve a su página (el `extensionImage(spec, kind)` del controlador del chat).
- **Instalar** la pone en el ámbito del agente, activada; la sesión en marcha no se toca, así que la conversación en curso no cambia por debajo. Está ahí en una conversación nueva, o ya: `/extensions reload` (el `reopen()` del controlador) vuelve a abrir la sesión con ella, conservando la conversación.
- **Actualizar** toma una copia nueva de su marketplace y la instala de nuevo en el mismo ámbito, conservando sus datos y opciones.
- **Desinstalar** la desactiva primero en la sesión en marcha, y borra sus datos solo cuando se pide.

La app web y de escritorio de Captain Whiskers lo muestran como un panel lateral con dos pestañas: las instaladas (activar, desactivar, ajustes, actualizar, desinstalar) y el catálogo como una cuadrícula de tarjetas (logo, nombre, versión, descripción, topics), con un buscador, chips de topics para filtrar y una tarjeta que abre sus detalles con su banner. En un host propio, lo hacen `extensionCatalog()`, `extensionImage()`, `installExtension()`, `updateExtension()`, `removeExtension()`, `extensionOptions()`, `setExtensionOptions()` y `reopen()` del controlador del chat (consulta [Hosts propios](../advanced/custom-hosts.md)).

## Las sugerencias del propio agente {#the-agents-own-suggestions}

La gente no sabrá qué extensiones existen si su agente no se lo dice. Con [awareness](../capabilities/awareness.md) y una carpeta de extensiones, el agente tiene `extensions_catalog`, una herramienta de solo lectura que responde tres cosas por separado:

- **Lo instalado aquí**: cada extensión en su ámbito, en marcha o apagada (y por qué), lo que permite hacer al agente y las opciones que aún necesita.
- **Lo que ofrecen los catálogos**: lo que ofrecen los marketplaces conocidos, según sus copias en este ordenador (al momento, sin red), cada uno con la antigüedad de su copia; solo lo que tiene alguno de los `catalogTopics` del agente, y solo lo que coincide con las palabras que busca el agente.
- **Lo nuevo en Internet**: con `refresh`, primero se vuelven a descargar los catálogos, y nombra las extensiones publicadas desde la última copia y las versiones nuevas de las instaladas. Como mucho una vez por marketplace y sesión; sin red, contesta con las copias y lo dice. Refrescar renueva las copias de los catálogos, nunca lo instalado.

El prompt le dice al agente cuándo usarla: cuando una petición es algo que sus herramientas no hacen bien, busca una extensión y, si alguna encaja, la sugiere en una frase (qué añade, qué necesita, `/extensions install <nombre>@<marketplace>`) y sigue con lo que puede hacer sin ella. Nunca instala, activa ni configura una por su cuenta, y no vuelve a sugerirla en una conversación cuando la persona la rechaza. Si le preguntan qué extensiones tiene, cómo configurar una o por qué está apagada, contesta con la herramienta y su skill `extensions`. Un miyagi al que piden corregir una tarea de Moodle sin Moodle sugiere `moodle-teacher`, y un padawan al que preguntan qué tiene pendiente, `moodle-student`: el `catalogTopics` de cada uno lo limita a lo suyo.

## En el chat {#in-the-chat}

`/extensions` funciona en los dos chats:

| Comando | Qué hace |
| --- | --- |
| `/extensions` | Con qué se ejecuta la sesión y qué permite hacer cada una al agente (sus [capacidades](overview.md#capabilities), en el idioma de la persona, con cualquier herramienta que su servidor no ofrezca y cualquiera que necesite un programa que le falta a este ordenador), qué está apagado y por qué, y qué está instalado. |
| `/extensions enable <name>`, `/extensions disable <name>` | Cambian el lock y lo aplican, en la misma sesión cuando se puede. |
| `/extensions config <name> [key=value…]` | Sus [opciones](configuring.md), y establecerlas (nunca un secreto: lo que se escribe en un chat se guarda en su historial). |
| `/extensions search [words]` | El [catálogo](#the-catalog). |
| `/extensions install <name>` | Instala una (`--yes` para una de otro marketplace, después de leer lo que dice). |
| `/extensions update [name]` | Actualiza una, o todas las que tienen una versión más nueva. |
| `/extensions remove <name>` | Desinstala una (`--delete-data` para borrar sus datos). |
| `/extensions reload` | Vuelve a abrir la sesión con lo que está instalado ahora, conservando la conversación. |
| `/extensions sign-in <nombre> [dirección]` | Inicia sesión en sus [servidores remotos](writing.md#a-remote-server) detrás de OAuth: abre la página de inicio de sesión en el navegador de este ordenador, muestra también el enlace y avisa cuando termina; con la dirección en la que acabó un navegador de otro ordenador, lo completa. `/extensions` lista quién lo necesita. |
| `/extensions sign-out <nombre>` | Cierra la sesión en sus servidores remotos. |
| `/extensions trust` | Confía en las extensiones del [workspace](workspaces.md); una sesión que se abre con alguna en la que no se confía pregunta antes. |

El chat debe tener un abridor de sesión (`runChatInk()` con uno, o el controlador del chat con uno) para aplicar un cambio.

## Activar y desactivar una mientras se ejecuta una sesión {#turning-one-on-and-off-while-a-session-runs}

**En la misma sesión** cuando la extensión se estaba ejecutando al abrirse la sesión: sus servidores MCP se apagan (sus herramientas salen del contexto del modelo) y su plugin se descarga (se van sus skills, comandos y subagentes), y vuelven con `enable`. Las puertas del kit, las etiquetas del chat, los comandos, `/extensions` y el `about_me` de [awareness](../capabilities/awareness.md) se actualizan, y al modelo se le avisa con el siguiente mensaje de la persona, ya que la sección Extensions del prompt sigue diciendo con qué se abrió la sesión. Para hacerlo, cada sesión carga el plugin de una extensión instalada a través de un enlace en la carpeta de la ejecución (`<runDir>/extensions/<name>/`, una junction en Windows), que elimina y vuelve a crear: no se copia nada, por grande que sea la extensión, y lo instalado nunca se toca. Donde no se puede crear un enlace (un disco que no los admite), es una copia, que se vacía y se rellena.

**Volviendo a abrir la sesión**, conservando la conversación, en los demás casos: una extensión que no se estaba ejecutando al abrirse la sesión (instalada después, o activada en el lock), o cuyos ficheros han cambiado desde que se instaló (una sesión nueva los juzga por su hash; los de una [enlazada](developing.md#linking-it) no se comprueban, así que vuelve a activarse con sus ficheros nuevos).

Una sesión que el agente construye por su cuenta recibe el mismo interruptor del `switchExtension(name, enabled)` de `buildSessionOptions()`, que devuelve `false` cuando hace falta una sesión nueva; necesita que la sesión se ejecute a través de `runQuery()`.

**Cuando se desactiva**, o la sesión se cierra, sus servidores terminan, con todos los procesos que arrancaron: un navegador que abrió Playwright también termina, y su perfil no queda bloqueado para el siguiente arranque (confirmado empíricamente en Windows: la CLI del SDK termina todo el árbol de procesos de un servidor).
