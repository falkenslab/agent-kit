---
sidebar_position: 6
title: Escribir una
description: Construye una extensión instalable desde cero (una extensión del tiempo con su propio servidor MCP empaquetado en un solo fichero, sus ajustes, herramientas de solo lectura, etiquetas del chat, un logo, una skill y un comando) y después las reglas que sigue toda extensión instalada.
---

# Escribir una extensión instalable

**Cualquier plugin de Claude Code es una extensión**, tal cual: sus skills, comandos y subagentes se cargan como en Claude Code, y sus servidores MCP arrancan desde su propio `.mcp.json`. Lo que añade agent-kit (etiquetas para el chat, un logo para el catálogo, capacidades, ayuda) va en `metadata["agent-kit"]` dentro de su manifiesto, que Claude Code no lee. Así, una misma carpeta sirve igual a los agentes basados en el kit y a Claude Code.

Esta página construye una desde cero: **weather**, el tiempo en la ciudad de la persona, para un agente que planifica con ella. Tiene su propio servidor MCP, un ajuste que la persona da una sola vez (su ciudad), una herramienta que solo lee, una skill, un comando y un logo. Después lista las reglas que sigue toda extensión instalada. La extensión terminada está en el marketplace de Falken's Lab, [agent-extensions/extensions/weather](https://github.com/falkenslab/agent-extensions/tree/main/extensions/weather), y se instala con `my-agent extension add weather@falkenslab` una vez añadido el marketplace.

## Lo que vas a construir {#what-youll-build}

```text
weather/
├── .claude-plugin/plugin.json    its manifest: name, version, settings, agent-kit's data
├── .mcp.json                     its MCP server, as Claude Code declares it
├── dist/server.mjs               the server, bundled into one file (built, committed)
├── src/server.mjs                the server's source
├── package.json                  for building it (not installed with it)
├── skills/plan-the-day/SKILL.md  a skill
├── commands/today.md             a command: /weather:today
├── assets/logo.svg               its logo in a catalog
└── README.md                     for people
```

Necesitas [Node.js](https://nodejs.org) 20 o posterior, un agente basado en agent-kit para probarla (Captain Whiskers sirve) y Claude Code 2.1.271 o posterior para validarla.

## 1. El servidor {#1-the-server}

Las herramientas de una extensión instalada vienen de su servidor MCP: un programa de Node que el kit arranca en un proceso aparte y que habla MCP por su entrada y su salida estándar. Escríbelo con el SDK oficial:

```bash
mkdir weather && cd weather
npm init -y
npm install --save-dev @modelcontextprotocol/sdk zod esbuild
```

```js title="src/server.mjs"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Its settings, as variables: the extension's options fill them in (step 3).
const city = process.env.WEATHER_CITY ?? "";
const imperial = process.env.WEATHER_UNITS === "imperial";

const server = new McpServer(
  { name: "weather", version: "0.1.0" },
  // What it's for and its rules: the model has them from the start.
  { instructions: "The person's weather: forecast for their city (today and the next days). Use it before suggesting plans that depend on the weather; never guess the weather." },
);

async function locate(name) {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
  const place = (await response.json()).results?.[0];
  if (!place) throw new Error(`No place called ${name}.`);
  return place;
}

server.registerTool(
  "forecast",
  {
    title: "Weather forecast",
    description: "The weather now and the forecast for the next days in the person's city (or another, if they name one): temperature, rain chance and wind.",
    inputSchema: { city: z.string().optional().describe("Another city than the person's"), days: z.number().int().min(1).max(7).default(1) },
    // It only reads: plan mode lets it through.
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ city: other, days }) => {
    const name = other || city;
    if (!name) return { isError: true, content: [{ type: "text", text: "No city set: the person sets it in the extension's settings (city)." }] };
    const place = await locate(name);
    const units = imperial ? "&temperature_unit=fahrenheit&wind_speed_unit=mph" : "";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=${days}${units}`;
    const data = await (await fetch(url)).json();
    const t = imperial ? "°F" : "°C";
    const lines = [
      `${place.name} (${place.country}): now ${data.current.temperature_2m}${t}, wind ${data.current.wind_speed_10m} ${imperial ? "mph" : "km/h"}.`,
      ...data.daily.time.map((day, i) => `${day}: ${data.daily.temperature_2m_min[i]}–${data.daily.temperature_2m_max[i]}${t}, rain ${data.daily.precipitation_probability_max[i]}%.`),
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

await server.connect(new StdioServerTransport());
```

**Empaquétalo en un solo fichero.** El kit instala los ficheros de una extensión y los ejecuta tal cual: nunca ejecuta `npm install`. Así que el servidor se distribuye con todo lo que necesita dentro:

```json title="package.json (its scripts)"
{
  "private": true,
  "type": "module",
  "scripts": { "build": "esbuild src/server.mjs --bundle --minify --platform=node --format=esm --target=node20 --outfile=dist/server.mjs" }
}
```

```bash
npm run build      # dist/server.mjs, about 700 kB, with the SDK and zod inside
```

Haz commit de `dist/server.mjs` y deja fuera `node_modules/` (`.gitignore`): lo que se instala es la carpeta tal como está en el repositorio. Un servidor ya publicado en npm no tiene por qué estar en la carpeta: consulta [Un servidor publicado en npm](#a-server-published-to-npm).

## 2. El manifiesto {#2-the-manifest}

`.claude-plugin/plugin.json` es el manifiesto del plugin, en el [formato de Claude Code](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema):

```json title=".claude-plugin/plugin.json"
{
  "name": "weather",
  "version": "0.1.0",
  "description": "The weather in your city, for an agent that plans with you: today and the next days, from Open-Meteo.",
  "author": { "name": "Ada Lovelace" },
  "license": "MIT",
  "keywords": ["weather", "planning"]
}
```

- `name` va en kebab-case y da nombre a todo lo demás: sus herramientas (`mcp__weather__forecast`), sus skills y comandos (`weather:plan-the-day`, `/weather:today`).
- `author` es un objeto (`{ name, email?, url? }`): una cadena sin más no pasa la validación.
- `keywords` son sus [topics](installing.md#the-catalog) en un catálogo.

Su servidor va en `.mcp.json`, tal como lo lee Claude Code:

```json title=".mcp.json"
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/dist/server.mjs"],
      "env": {
        "WEATHER_CITY": "${user_config.city}",
        "WEATHER_UNITS": "${user_config.units}"
      }
    }
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` es la carpeta de la extensión, esté donde esté instalada. `${user_config.…}` viene a continuación.

## 3. Sus ajustes {#3-its-settings}

La ciudad de la persona es un ajuste: se declara en el manifiesto como el `userConfig` de Claude Code, se pregunta al instalar la extensión y se pasa al servidor donde lo nombra `.mcp.json`. Añade a `plugin.json`:

```json title=".claude-plugin/plugin.json (its settings)"
"userConfig": {
  "city": { "type": "string", "title": "Your city", "description": "Where you are, e.g. Santa Cruz de Tenerife.", "required": true },
  "units": { "type": "string", "title": "Units", "description": "metric (°C, km/h) or imperial (°F, mph).", "options": ["metric", "imperial"], "default": "metric" }
}
```

- Una opción tiene un `type` (`string`, `number`, `boolean`, `directory`, `file`), un `title` y una `description` escritos para la persona, y puede tener `required`, `default`, `sensitive` (un secreto), `options` (valores fijos), `multiple` y `min`/`max`. Todos los campos están en la [referencia](reference.md#userconfig).
- Sin su `city` obligatoria, la extensión se queda apagada, diciendo cómo establecerla; en Claude Code, se pregunta al activar el plugin.
- Un secreto (`sensitive: true`) se guarda aparte y nunca se vuelve a mostrar. Lo que hace la persona con las opciones está en [Configuración](configuring.md).

## 4. Los datos de agent-kit {#4-agent-kits-data}

Lo que usan el chat, las puertas y el catálogo del kit va en `metadata["agent-kit"]` dentro de `plugin.json`. Todo es opcional:

```json title=".claude-plugin/plugin.json (agent-kit's data)"
"metadata": {
  "agent-kit": {
    "catalog": { "logo": "assets/logo.svg" },
    "description": { "es": "El tiempo en tu ciudad, para un agente que planifica contigo: hoy y los próximos días." },
    "capabilities": [
      {
        "id": "weather-forecast",
        "skills": ["plan-the-day"],
        "tools": ["forecast"],
        "texts": {
          "en": { "label": "Planning around the weather", "description": "Today's and the next days' forecast in your city, and a plan B when rain is likely." },
          "es": { "label": "Planificar según el tiempo", "description": "El tiempo de hoy y de los próximos días en tu ciudad, y un plan B si va a llover." }
        }
      }
    ],
    "help": "Weather: `forecast` gives today and the next days in your city; /weather:today sums up the day.",
    "labels": {
      "forecast": {
        "en": { "label": "Checking the weather in {city}", "phrase": ["checked the weather", "checked the weather {n} times"] },
        "es": { "label": "Mirando el tiempo en {city}", "phrase": ["miró el tiempo", "miró el tiempo {n} veces"] }
      }
    }
  }
}
```

- **`labels`**: cómo muestra el chat cada herramienta, por idioma: la línea mientras se ejecuta (`{city}` toma la entrada de la llamada) y cómo cuenta en un [resumen plegado](../terminal-ui/tool-labels.md#folded-summaries), y opcionalmente `result`, la línea que se muestra debajo cuando sale bien, en lugar de la primera línea del resultado, que está escrita para el modelo. Sin ellas, el chat muestra el nombre de la herramienta.
- **`description`**: su descripción en otros idiomas (`es`, `fr`, `de`), mostrada en el de la persona: el catálogo en los chats y el panel lateral de Captain Whiskers, `extension info` y el `catalog.json` del marketplace. El inglés sigue siendo la propia `description` de `plugin.json`, que lee Claude Code; el prompt también la conserva, ya que el modelo lee inglés. Un `README.es.md` junto a `README.md` es el README en español: `extension info` lo señala en una sesión en español, y `catalog.json` lo lista.
- **`capabilities`**: lo que el agente puede hacer con ella, para la persona: las `skills` (sus carpetas en `skills/`) y las `tools` (nombres cortos) de cada una juntas, con una `label` y una `description` por idioma (inglés donde falte el de la persona). `/extensions`, `about_me`, `extension info` y el catálogo las muestran; sus ids cuentan como [proporcionados](overview.md#capabilities). Al instalar se comprueba que existe cada skill nombrada; las herramientas solo las lista un servidor en marcha, así que `/extensions` dice cuándo una no se ofrece. Agrupa las herramientas según lo que la persona consigue hacer, no una capacidad por herramienta: una extensión con 140 herramientas se lee como un puñado de capacidades.
- **`help`**: lo que dice de sí misma, para que el agente se lo cuente a la persona (el `about_me` de [awareness](../capabilities/awareness.md)).
- **`catalog`**: su aspecto en un catálogo ([más abajo](#6-its-look-in-a-catalog)).
- **Herramientas de solo lectura**: aquí no hay nada que declarar, ya que `forecast` dice `readOnlyHint: true` por sí misma y el modo plan pregunta al servidor ([Herramientas de solo lectura](#read-only-tools)).
- **Herramientas que siempre preguntan**: ninguna aquí, ya que el tiempo no cambia nada; una extensión que crea o publica en la cuenta de la persona las lista en `confirmTools` ([Herramientas que siempre preguntan](#tools-that-always-ask)).

Nunca lo pongas en el nivel superior de `plugin.json`: Claude Code avisaría ("Unknown field") y la validación con `--strict` fallaría. Todos los campos están en la [referencia](reference.md#metadataagent-kit), y `agent-kit-metadata.schema.json` (en `schemas/` del kit) permite que un editor lo compruebe.

## 5. Una skill y un comando {#5-a-skill-and-a-command}

La herramienta dice qué hace; una skill dice **cómo hacer bien un trabajo** con ella, y solo se carga cuando el modelo la necesita:

```markdown title="skills/plan-the-day/SKILL.md"
---
name: plan-the-day
description: Plan the person's day or week around the weather - check the forecast first, then suggest when to do what. Use when they ask what to do today, when to go out, or to plan outdoor activities.
---

# Planning around the weather

1. Call `forecast` (with `days` for a week). Never guess the weather.
2. Put what has to be outdoors on the dry, mild hours or days; say why ("rain 70% on Thursday").
3. Name a plan B when the rain chance is over 40%.
```

Un comando es un flujo que escribe la persona (`/weather:today`):

```markdown title="commands/today.md"
---
description: Today's weather in your city, in two lines
---

Call `forecast` for today and tell the person, in two short lines, what the day looks like and whether they need a jacket or an umbrella.
```

Los subagentes van en `agents/*.md`, como en Claude Code. Una skill puede requerir una [capacidad](overview.md#capabilities) (`requires: knowledge-base`) para ofrecerse solo cuando otra extensión la proporciona.

## 6. Su aspecto en un catálogo {#6-its-look-in-a-catalog}

Un `logo` cuadrado (y un `banner` ancho, de unos 3:1) la convierten en una tarjeta en un [catálogo](installing.md#the-catalog): SVG, PNG, JPEG o WebP, dentro de su carpeta, nombrados en `metadata["agent-kit"].catalog`. Una imagen fuera de su carpeta, o de otro tipo, no se muestra.

```xml title="assets/logo.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="weather">
  <rect width="64" height="64" rx="14" fill="#1e66d0"/>
  <circle cx="26" cy="26" r="10" fill="#ffd23f"/>
  <path d="M22 46h22a8 8 0 0 0 0-16 11 11 0 0 0-21 3 7 7 0 0 0-1 13z" fill="#fff"/>
</svg>
```

## 7. Valídala {#7-validate-it}

```bash
claude plugin validate --strict .
```

Debe pasar sin avisos: es la misma comprobación que ejecuta la CI de un marketplace. Después [pruébala en un agente](developing.md) (`my-agent extension add ./weather --link --set city=Madrid`) y [publícala](publishing.md).

Un `README.md` en su raíz es para las personas: qué hace, qué ofrece (sus herramientas, skills y comandos), sus ajustes, cómo instalarla. El modelo nunca lo lee; `extension info` dice dónde está.

## Las reglas que sigue toda extensión instalada {#the-rules-every-installed-extension-follows}

### Sus servidores {#its-servers}

- **Node, o npx.** `command` es `node` y el primero de `args` es su script, dentro de la extensión (`${CLAUDE_PLUGIN_ROOT}/…`); el resto de `args` llegan al script. O `command` es `npx`, con `-y` y un paquete en una versión exacta ([Un servidor publicado en npm](#a-server-published-to-npm)). Cualquier otro comando (`python`, `docker`, `npx` sin una versión exacta) deja la extensión apagada, diciendo por qué: el kit solo ejecuta código instalado a través de su lanzador.
- **Los nombres de sus herramientas** vienen de los de su servidor: `mcp__<server>__<tool>`.
- **Su entorno** son las variables del sistema (dónde están las cosas, la sesión de escritorio: `PATH`, `TEMP`, `HOME`, `APPDATA`, `PROGRAMFILES`, `DISPLAY`, `XDG_*`, el idioma y la zona horaria…) y las de su `env`, nada más del agente: tampoco sus credenciales. En `args` y `env`, `${CLAUDE_PLUGIN_ROOT}` es su carpeta, `${CLAUDE_PLUGIN_DATA}` su [carpeta de datos](#its-data), `${user_config.KEY}` una de sus opciones, `${agent_kit.language}` el idioma de la sesión, y `${VAR}` una variable propia del agente (`"API_KEY": "${API_KEY}"`, del `.env` del agente). El idioma de la sesión (`en`, `es`, `fr`, `de`) también es su variable `AGENT_KIT_LANGUAGE`: un servidor que pregunta algo a la persona por su cuenta (elicitación) o escribe mensajes que ella lee puede hacerlo en su idioma; uno que no la lee funciona como antes.
- **Para qué sirve y sus reglas** van en las `instructions` de su servidor: el modelo las tiene desde el principio. Mantenlas cortas; los procedimientos van en skills.
- **Se ejecuta desde lo instalado**: sin dependencias, o empaquetado con ellas en un solo fichero. Una carpeta instalada con su `node_modules` de desarrollo se hashea entera en cada sesión (segundos para decenas de miles de ficheros): instala la extensión construida, no la carpeta de desarrollo, y [enlázala](developing.md#linking-it) mientras la desarrollas.

### Herramientas de solo lectura {#read-only-tools}

El [modo plan](../core-concepts/modes.md#plan) solo deja pasar las herramientas de las que se sabe que solo leen. Una extensión instalada dice cuáles de una de dos formas:

- **Las pistas de sus servidores**, cuando su manifiesto no tiene `readOnlyTools`: una herramienta cuyo servidor declara `annotations: { readOnlyHint: true }` pasa, consultado a la sesión en marcha cuando el modo plan se encuentra con la llamada, así que un servidor que gana una herramienta no necesita ningún cambio en el manifiesto. Un servidor que aún se está conectando, uno apagado o uno que no responde en 3 segundos cuenta como que no.
- **La lista de su manifiesto**, `readOnlyTools` en `metadata["agent-kit"]`: la respuesta completa, digan lo que digan sus servidores. Una lista vacía (`[]`) significa que no pasa ninguna de sus herramientas. Un servidor es el código en el que menos confía el kit, así que sus pistas solo cubren la ausencia de la lista: escribe la lista cuando no te fíes de lo que dice un servidor, o no puedas cambiarlo.

`extension info <name>` dice cuál se aplica (`Only read  roll (its manifest)`, o `what its servers mark readOnlyHint`).

La misma lista evita que el modo guiado pregunte: el resto de herramientas de una extensión instalada esperan ahí el sí de la persona ([Las herramientas de las extensiones que cambian cosas](../human-in-the-loop/approvals.md#extensions-tools-that-change-things)). Una herramienta que falte en la lista pregunta cada vez, así que lista todas las que solo leen.

### Herramientas que siempre preguntan {#tools-that-always-ask}

En modo guiado la persona puede aprobar un lote de llamadas de una vez, o una herramienta para la sesión o para siempre. Algunas herramientas nunca deberían aprobarse sin verlas: lo que crea, edita, publica o borra en su cuenta. Lístalas en `confirmTools` dentro de `metadata["agent-kit"]` (nombres cortos):

```json
"metadata": { "agent-kit": { "confirmTools": ["create-design", "publish-design"] } }
```

Preguntan en cada llamada, incluso dentro de un lote aprobado, y a la persona solo se le ofrece sí, no y "no, nunca": nunca "en esta sesión" ni "siempre". Sin la clave, cuentan en su lugar las herramientas que sus servidores marcan `destructiveHint: true`, igual que funcionan `readOnlyTools` y `readOnlyHint`. El agente puede añadir las suyas ([`extensionGate.confirmTools`](../core-concepts/agent-spec.md#extensiongate)).

### Herramientas cuyo servidor pregunta él mismo {#tools-whose-server-asks-itself}

Un servidor puede preguntar a la persona antes de actuar, en mitad de la herramienta, mediante [la elicitación de MCP](../human-in-the-loop/elicitation.md): moodle-mcp lo hace antes de borrar, dar de baja o reiniciar un curso. Esa pregunta es la más fuerte (su respuesta nunca llega al modelo, y vale en cualquier cliente), así que la del kit solo haría preguntar dos veces. Lista esas herramientas en `serverConfirmTools` (nombres cortos):

```json
"metadata": { "agent-kit": { "serverConfirmTools": ["delete_activity", "unenrol_user", "reset_course"] } }
```

En modo guiado el kit las deja pasar sin su propia pregunta, y pregunta el servidor; un "no, nunca" que la persona guardó sigue valiendo. El modo plan las sigue parando (no son de solo lectura), y el modo autónomo las sigue denegando salvo que el agente lo permita, ya que ahí nadie contestaría al servidor. Lista solo herramientas cuyo servidor pregunte de verdad: una listada que no lo haga se ejecutaría sin preguntar.

### Programas que necesita {#programs-it-needs}

El kit instala los ficheros de una extensión y nunca un programa. Un servidor que ejecuta uno que instala la persona (Docker para un laboratorio, ffmpeg o `yt-dlp` para vídeos) lo declara en `requirements`, y el kit lo comprueba, dice qué falta, para qué y cómo instalarlo en este sistema, y solo deja apagado lo que lo necesita:

```json title=".claude-plugin/plugin.json (its requirements)"
"requirements": [
  {
    "name": "Docker",
    "program": "docker",
    "version": { "args": ["--version"], "min": "24.0.0" },
    "install": {
      "windows": "winget install Docker.DockerDesktop",
      "macos": "brew install --cask docker",
      "url": "https://docs.docker.com/engine/install/"
    },
    "for": ["practice-lab"]
  }
]
```

- **La comprobación**: `program` es un nombre sin más que se encuentra en el `PATH` (en Windows, con las extensiones de `PATHEXT`), nunca una ruta. Con `version`, el kit lo ejecuta solo con esos argumentos (opciones como `--version`, o `version`; nunca `docker run …`), sin shell y con un límite de cinco segundos, y compara el primer `x.y.z` que imprime con `min`. Un programa que no imprime versión, o un script de Windows (`.cmd`, `.bat`, que no pueden ejecutarse sin shell), cuenta como presente. La instalación rechaza un requisito que no se pueda comprobar así.
- **Lo que se deja apagado**: con `for`, solo esas capacidades (ids que proporciona): no se proporcionan, sus skills se quedan fuera, y el prompt, `/extensions` y `about_me` dicen qué instalar. Sin `for`, toda la extensión lo necesita, y se queda apagada con el motivo. En ambos casos se instala, y `extension add`, `/extensions install` y el controlador del chat dicen qué falta.
- **Cómo instalarlo**: un comando por sistema (`windows`, `macos`, `linux`) y un enlace (`url`) para el resto; la persona lee el de su sistema.
- **Cuándo se comprueba**: cada vez que se abre una sesión (`/extensions reload` después de instalarlo), nunca en mitad de una.
- **En Claude Code**, que no lee `metadata`, lo dice el propio servidor: dale una herramienta de solo lectura `check_requirements`, y haz que una herramienta cuyo programa falte falle diciendo qué falta, para qué es y cómo instalarlo, en lugar de con un `ENOENT` sin más.

### Sus datos {#its-data}

Una extensión instalada tiene una carpeta de datos propia, nombrada en los `args` y el `env` de sus servidores como `${CLAUDE_PLUGIN_DATA}`, como la de Claude Code para un plugin: `<scope>/.data/<name>/` (p. ej. `~/.my-agent/extensions/.data/weather/`), o la carpeta privada de un workspace dentro de la del agente ([Workspaces](workspaces.md)). Guarda ahí lo que tenga que durar: un perfil de navegador con la sesión iniciada, una caché, un navegador descargado.

```json
{ "mcpServers": { "moodle": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/dist/server.mjs", "--profile", "${CLAUDE_PLUGIN_DATA}/profile"] } } }
```

- Se crea cuando una sesión arranca la extensión, fuera de su plugin y de su hash: lo que el servidor escribe ahí nunca apaga la extensión.
- Se conserva cuando la extensión se vuelve a instalar o se actualiza, y cuando se elimina, salvo que la persona diga que se borre.
- Nunca escribas en la propia carpeta de la extensión: una actualización la sustituye, y un fichero modificado deja la extensión apagada hasta que se vuelva a instalar.

### Un servidor publicado en npm {#a-server-published-to-npm}

Un servidor MCP publicado en npm por su cuenta (utilizable con `npx` en Claude Code o Codex) no tiene por qué copiarse en la extensión: su `.mcp.json` lo ejecuta con `npx`, y la extensión es su manifiesto, ese fichero, y sus skills y comandos. La [extensión moodle-teacher](https://github.com/falkenslab/agent-extensions/tree/main/extensions/moodle-teacher) de Falken's Lab es una (y [moodle-student](https://github.com/falkenslab/agent-extensions/tree/main/extensions/moodle-student), el mismo servidor para un estudiante):

```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp@0.3.0"],
      "env": { "MOODLE_MCP_SITES": "${user_config.sites}" }
    }
  }
}
```

Claude Code ejecuta ese `npx` tal cual. El kit no ejecuta npx (necesitaría npm, un `node` en el `PATH` y red mientras el servidor se conecta, y una app de escritorio no tiene nada de eso). En su lugar:

- **Cuando se instala la extensión**, el kit descarga el paquete del registro de npm, lo comprueba contra la `integrity` del registro (sha512) y lo guarda en la caché de paquetes del agente, `<agent scope>/.npm/<package>/<version>/`, compartida por todas las extensiones y ámbitos que ejecutan esa versión. El lock lo registra (`packages`: su integridad, un SHA-256 de sus ficheros, su `bin`).
- **Cuando arranca una sesión**, el servidor es el `bin` del paquete ejecutado con el propio Node del agente (el de Electron, en una app de escritorio) a través del lanzador, como cualquier servidor instalado. Sin npm y sin red: un paquete que falta en la caché, o cuyos ficheros han cambiado ahí, deja la extensión apagada, diciendo que se vuelva a instalar.
- **Solo una versión exacta**: `<package>@x.y.z`. Una versión publicada en npm nunca cambia, así que la extensión ejecuta siempre el mismo código; sin versión, con un rango o con una etiqueta (`@latest`), no se puede instalar. La única opción es `-y` (`--yes`).
- **El paquete trae lo que necesita**: el kit no instala dependencias ni ejecuta scripts. Un paquete cuyas `dependencies` no estén todas en `bundleDependencies`, con scripts de instalación (`preinstall`, `install`, `postinstall`) o con código nativo que compilar (`binding.gyp`) no se puede instalar, y se dice por qué. Empaqueta el servidor, y lista en `bundleDependencies` lo que no se pueda empaquetar (`playwright-core`). El kit solo lee `package.json`: lo que empaquetas dentro del programa va en `devDependencies`, o cuenta como una dependencia que el paquete no trae.
- **Su `bin`** es el único del paquete, o el que se llama como el paquete (`moodle-mcp` para `@falkenslab/moodle-mcp`), igual que lo elige npx.
- **Actualizar el servidor** es una versión nueva en `.mcp.json` y una versión nueva de la extensión; las skills escritas para esa versión van en el mismo cambio.

### Un servidor remoto {#a-remote-server}

Un servidor puede ejecutarse en otro sitio, como un servicio, y alcanzarse por HTTP: no se instala ni se arranca nada en el ordenador. En `.mcp.json`, `type` (`http`, o `sse` para un servidor más antiguo) y `url`, con `headers` cuando recibe un token:

```json title=".mcp.json"
{
  "mcpServers": {
    "api": {
      "type": "http",
      "url": "https://mcp.example.com/mcp?site=${user_config.site}",
      "headers": { "Authorization": "Bearer ${user_config.token}" }
    }
  }
}
```

- **Su dirección** tiene que ser `https` (`http` solo en `localhost`, para un servidor en desarrollo); la instalación rechaza cualquier otra.
- **Sus opciones** van en `url` y `headers` (`${user_config.KEY}`, `${VAR}`) cuando se abre la sesión: el SDK las fija entonces, así que un valor cambiado se aplica cuando la sesión vuelve a abrirse (`/extensions reload`). Una cabecera que nombra una opción sin valor no se envía, así que un token puede ser opcional: con `Authorization` puesta, el CLI no inicia sesión con OAuth.
- **Su nombre en la sesión** es el de la extensión y el suyo, `<extensión>-<servidor>` (`mcp__campus-api__get_time`): el CLI guarda los tokens de inicio de sesión por nombre de servidor, y un nombre propio nunca recoge los tokens del propio Claude Code de quien lo ejecuta. Las etiquetas y las herramientas de solo lectura del manifiesto usan los nombres cortos de sus herramientas, como siempre.
- **Iniciar sesión**: un servidor detrás de OAuth empieza necesitándolo. `/extensions` lo dice, y `/extensions sign-in <nombre>` (`signInExtension()` del controlador del chat) abre la página de inicio de sesión en el navegador de este ordenador (no por SSH ni sin pantalla; un agente lo desactiva con `openBrowser: false` en los chats) y muestra el enlace en su propia línea, un enlace de terminal que sigue entero aunque el chat lo parta; su navegador vuelve al CLI en este ordenador y el servidor se conecta. Desde un navegador en otro ordenador, pega la dirección en la que acabó: `/extensions sign-in <nombre> <dirección>`. `/extensions sign-out <nombre>` cierra la sesión. El token se guarda en la carpeta de configuración de Claude Code que usa el CLI del agente, y una sesión nueva no vuelve a pedirlo. Usa los métodos de inicio de sesión del SDK, que aún no están en sus tipos ([ADR-028](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-028-remote-mcp-sign-in.md)): sin ellos, el agente dice que no puede iniciar sesión. Mientras un servidor espera el inicio de sesión, sus herramientas (y las skills de la extensión que dirían cómo) no están, así que se lo dice el propio kit al modelo: una regla en el prompt de sistema en las sesiones con extensiones remotas y, con el siguiente mensaje de la persona, qué extensión espera, una vez hasta que vuelva a tener la sesión iniciada (también tras `/extensions sign-out`). El modelo le pide a la persona que ejecute `/extensions sign-in <nombre>`, nunca `/mcp`, `claude mcp` ni los conectores de claude.ai de Claude Code; `about_me` lista las extensiones que esperan.
- **Adónde van los datos**: lo que el agente le envía sale del ordenador. La instalación dice con qué host habla, y también `extension info` y el catálogo.
- **No enviarle datos**: un agente que maneja datos sensibles pone [`remoteServers`](../core-concepts/session-config.md) a `"ask"` (la persona aprueba cada llamada, sabiendo adónde va) o `"deny"`.
- **Las herramientas de solo lectura y las etiquetas** funcionan como en un servidor local: el modo plan se fía del `readOnlyHint` de sus herramientas, o de la lista del manifiesto.

### Lo que no puede hacer {#what-it-cant-do}

A diferencia de una extensión en el código de tu agente ([Las propias del kit](the-kits-own.md#writing-one-in-your-agents-code)): hooks (no se ejecuta ninguno de los de su plugin), los paneles del kit, un almacén pasado desde código, sus propias carpetas para las herramientas de ficheros. Sus subagentes no reciben `Bash`: uno que la lista la pierde, y uno sin `tools` no recibe ninguna. Sus herramientas pasan por las mismas puertas que cualquier otra: la aprobación en modo interactivo, el modo plan, la transcripción.

### Cuando se desactiva {#when-its-turned-off}

Desactivar una extensión en la sesión, o cerrar la sesión, termina sus servidores y todos los procesos que arrancaron (un navegador que abrió, con todos sus propios procesos), así que un perfil que tuviera en uso no queda bloqueado para el siguiente arranque. Un servidor no tiene por qué limpiar por su cuenta, pero puede hacerlo: cerrar un navegador cuando termina su entrada guarda bien el estado del navegador.
