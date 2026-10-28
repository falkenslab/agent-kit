---
sidebar_position: 1
title: Captain Whiskers
description: Qué sabe hacer el agente de ejemplo del kit, con capturas de pantalla, y un recorrido por su código, pieza a pieza.
---

# Captain Whiskers

[Captain Whiskers](https://github.com/falkenslab/agent-kit/tree/main/examples/captain-whiskers) es el ejemplo del kit: un gato pirata retirado que cuenta chistes en el terminal y lleva un cuaderno de bitácora con lo que aprende y un cofre de documentos originales. Es pequeño, pero usa la mayor parte del kit, así que es la mejor plantilla para un agente propio.

![Captain Whiskers ejecutándose a pantalla completa en Windows Terminal](/captain-whiskers.png)

Esta página muestra primero lo que sabe hacer, cada cosa con una captura de una sesión real y la pieza del kit que hay detrás, y luego [recorre su código](#running-it).

## Qué sabe hacer {#what-he-can-do}

### Hablar {#talk}

Responde en el chat como cabría esperar de Claude Code: la respuesta llega en streaming con su markdown ya formateado, las tablas dibujadas como cuadrículas y sus llamadas a herramientas plegadas bajo cada paso. Todo es el [chat Ink](../terminal-ui/ink-chat.md) del kit; el capitán solo le da una cabecera, un tema y sus textos.

![El capitán responde con una tabla de chistes y sus puntuaciones](/captain/conversation.png)

### Mandar a su tripulación {#send-his-crew}

Tiene tres [subagentes](../capabilities/subagents.md): un gatito que busca chistes en la web, un loro gruñón que los puntúa y un grumete que lee el reloj. El chat muestra las llamadas a herramientas de cada subagente bajo la llamada que lo lanzó. Las [puertas (gates) de los subagentes](../security/subagent-gates.md) del kit los mantienen dentro de sus tipos y herramientas declarados, y en primer plano.

![El gatito busca dos veces en la web y el loro puntúa cada chiste](/captain/crew.png)

### Preguntarte {#ask-you}

Cuando necesita que elijas, pregunta en un panel en lugar de terminar su turno con una pregunta, y sigue con tu respuesta en el mismo turno. "Otra" te permite escribir la tuya. Es la herramienta [`ask_human`](../human-in-the-loop/choices-and-plans.md) del kit.

![Un panel pregunta qué tipo de chiste: clásico, nuevo o del cuaderno de bitácora](/captain/ask.png)

### Llenar su cofre {#stock-his-chest}

Su cofre (`treasure/`) guarda los documentos originales de los que aprende, que puede leer pero nunca cambiar. Descarga páginas web en él, guardadas también como markdown para poder citarlas, y te pide ficheros tuyos. Son las [herramientas de las fuentes](../capabilities/knowledge-base.md#sources-originals-kept-as-obtained) del kit: `download_to_sources` y `request_file`. No se sobrescribe nada, y un fichero idéntico no se copia dos veces.

![Dos páginas de Wikipedia descargadas en el cofre y, después, un panel que pide un libro de chistes](/captain/chest.png)

### Aprender de él {#learn-from-it}

`/captain-whiskers:learn` lee cada original que aún no ha aprendido, incluidas las notas del orador de PowerPoint, y escribe en su cuaderno de bitácora lo que enseña: un resumen de cada documento y una página por concepto, creados a la vez. `list_sources` dice qué hay de nuevo, [`extract_text`](../capabilities/knowledge-base.md#adding-originals) lee Word y PowerPoint, y las [herramientas `knowledge_*`](../capabilities/knowledge-base.md#the-tools) llevan el cuaderno.

![El capitán lee un PowerPoint y un documento de Word y crea las páginas del cuaderno de bitácora](/captain/learn.png)

### Recordar {#remember}

Su cuaderno de bitácora (`logbook/`) es su memoria entre sesiones: una wiki de páginas a las que solo llega mediante las herramientas de conocimiento. Además de los tipos de página del kit, tiene uno propio, `joke`, con la puntuación del loro visible en el índice ([tus propios tipos de página](../capabilities/knowledge-base.md#your-own-page-types)). Con su jokebook instalado, `/jokebook:best-jokes` los clasifica y archiva la clasificación como una página.

![El capitán clasifica los chistes de su cuaderno de bitácora según la puntuación del loro](/captain/remember.png)

### Enmendar errores {#set-things-right}

Si le dicen que un documento era el equivocado, pregunta antes de sacarlo del cofre: [`retire_source`](../capabilities/knowledge-base.md#retiring-an-original) lo aparta en lugar de borrarlo, y después retira su página de resumen con las propias herramientas del cuaderno (preguntando otra vez), para no seguir apoyándose en él.

![Un panel de aprobación para retirar el documento de las normas del barco](/captain/retire.png)

### Saber la fecha {#know-the-date}

El grumete responde a "cuántos días faltan para…" con [`current_time` y `date_math`](../capabilities/tools-and-mcp.md#date-and-time) del kit, en lugar de contar con las patas.

![El grumete calcula los días que faltan para el Día Internacional de Hablar como un Pirata](/captain/date.png)

### Organizar una misión {#organize-a-mission}

Para cualquier cosa con varios pasos lleva una lista de tareas, dibujada bajo el spinner a medida que avanza: pendiente, en curso, hecha. Es el `TodoWrite` del SDK, [dibujado por el chat](../terminal-ui/ink-chat.md#whats-on-screen).

![Los cuatro pasos de una búsqueda del tesoro, dos hechos y uno en curso](/captain/tasks.png)

### Planificar antes de actuar {#plan-before-acting}

En [modo plan](../core-concepts/modes.md#plan) solo puede leer y planificar. Cuando el plan está listo, lo presenta: *Ejecutarlo* sale del modo plan y lo lleva a cabo en el mismo turno; *Seguir planificando* te deja decir qué cambiar.

![Un plan de fiesta en un panel, con Ejecutarlo, Seguir planificando y Cancelar](/captain/plan.png)

### Ir paso a paso {#go-step-by-step}

En modo interactivo, la [puerta de pasos](../human-in-the-loop/step-gate.md) del kit detiene cada llamada a herramienta, incluidas las de su tripulación, hasta que la apruebas. `CAPTAIN_MODE=interactive npm start`, o Shift+Tab en cualquier modo menos el autónomo.

![La puerta de pasos pregunta antes de que el capitán delegue en el grumete](/captain/step-gate.png)

### Explicarse {#explain-himself}

Tiene el [awareness](../capabilities/awareness.md) del kit: si le preguntan en qué modo está o qué sabe hacer, se mira a sí mismo (`about_me`) y responde con el modo tras un Shift+Tab, sus extensiones y sus herramientas, lo que está apagado y por qué, y su tripulación; si le preguntan cómo hacer algo, carga la skill `help` para el chat (reanudar, teclas, modos) y la guía de `about_me` para sus propios comandos, carpetas y ajustes (su `guide.md`).

![El capitán explica /resume y cómo hacer que aprenda un documento](/captain/agent-help.png)

### Traer su propia extensión {#bring-his-own-extension}

Además de `sources`, `knowledge` y `memory` del kit (lo que recuerda de quien navega con él, en el `memory/` de su casa: consulta [Memoria de la persona](../capabilities/memory.md)), se le pueden dar más. Su `jokebook` es una que podría instalar cualquier agente del kit: una carpeta (`extensions/jokebook/`) con su manifiesto, su propio servidor MCP (un pequeño script de Node que el kit ejecuta en un proceso aparte), una skill y el loro. La ofrece su propio [marketplace](../extensions/installing.md#marketplaces), `shipyard` (`extensions/.claude-plugin/marketplace.json`), que pasa al comando del kit como `official` y a su configuración como `officialMarketplace`. Su navegador y su aplicación la instalan desde ahí en su primer arranque (solo en el primero: una que la persona desinstala sigue desinstalada); en el terminal, `npm start -- extension add jokebook` la instala en el `extensions/` de su casa, su único ámbito, ya que su casa es su único proyecto. Su herramienta, `classic_joke`, cuenta un clásico del libro; su skill, `rank-jokes`, clasifica los chistes de su cuaderno de bitácora y requiere la capacidad `knowledge-base`, así que solo se ofrece con el cuaderno activado. Su manifiesto describe ambas como [capacidades](../extensions/overview.md#capabilities), "Pirate jokes" y "Ranking jokes", que `/extensions` y el panel lateral muestran en su idioma. Si le pides algo que haría una extensión de su astillero (el jokebook, si no está instalado), la sugiere en una frase y nunca la instala él mismo ([las sugerencias del propio agente](../extensions/installing.md#the-agents-own-suggestions)). En el chat, `/extensions` lista con qué se ejecuta, `/extensions disable jokebook` la apaga en la misma sesión y `enable` la vuelve a encender. En su navegador y en su aplicación, el panel lateral de extensiones tiene dos pestañas: las instaladas (encender o apagar, ajustes, actualizar, desinstalar) y el catálogo de su shipyard como una cuadrícula (el logotipo, el nombre, la versión, la descripción y los temas de cada extensión; un buscador y chips de temas para filtrar; sus detalles con su banner y lo que le permite hacer; instalar, y usarla ahora o en una conversación nueva). El jokebook tiene un logotipo (`assets/logo.svg`). Consulta [Extensiones](../extensions/installing.md).

### Hablar tu idioma {#speak-your-language}

Habla el idioma del kit, el del sistema o el indicado con `--language`: su nombre, sus textos, los propios del kit y sus respuestas. Aquí, como Capitán Bigotes. Consulta [Idiomas](../sessions/languages.md).

![El mismo capitán en español, como Capitán Bigotes](/captain/languages.png)

### En un navegador y en el escritorio {#in-a-browser-and-on-the-desktop}

El mismo capitán funciona en un navegador (`npm start -- --web`) y como aplicación de Windows, que es esa misma página en una ventana propia: la misma casa, el mismo cuaderno, las mismas extensiones. Las dos son vistas del [controlador del chat](../advanced/custom-hosts.md#the-chat-controller) del kit, así que todo lo anterior funciona también ahí; solo el dibujo es suyo (ver [En un navegador y en el escritorio](#7-in-a-browser-and-on-the-desktop) más abajo). Te recibe con unas cuantas misiones para elegir, y arriba están el modo, las acciones rápidas, el idioma, una conversación nueva, las anteriores y las extensiones.

![La página de bienvenida del capitán en el navegador, con cuatro misiones para elegir](/captain/web-es-welcome.png)

Sus preguntas llegan como diálogos, en los que siempre cabe una respuesta tuya. Aquí `ask_human`, como en el terminal:

![Un diálogo pregunta qué clase de chiste: un clásico pirata, uno fresco o uno del cuaderno de bitácora](/captain/web-es-conversation.png)

Sus llamadas a herramientas se pliegan en una tarjeta con lo que devolvió cada una, y luego viene la respuesta:

![Las llamadas del capitán desplegadas (la pregunta, la skill, el libro de chistes) y su chiste](/captain/web-es-answer.png)

El modo está a un clic, cada uno con lo que significa:

![El menú de modos: guiado, interactivo y plan](/captain/web-es-modes.png)

El cajón de extensiones lista con qué funciona, con las extensiones propias del kit marcadas como integradas, y el catálogo de su astillero en una cuadrícula; los detalles de una extensión dicen lo que le permite hacer, en su idioma:

![El cajón de extensiones, con las extensiones integradas del kit y el libro de chistes](/captain/web-es-extensions.png)

![Los detalles del libro de chistes sobre el catálogo: sus dos capacidades, sus temas y un botón Actualizar](/captain/web-es-details.png)

## Ejecutarlo {#running-it}

Desde un clon del kit:

```bash
npm install && npm run build           # the kit, once and after each change to it
cd examples/captain-whiskers
npm install
npm start                               # full screen, in the system's language
npm start -- --language=en              # in English
npm start -- --continue                 # resume the latest conversation
CAPTAIN_MODE=interactive npm start      # ask before every tool call (guided by default)
CAPTAIN_TOOL_DETAIL=summary npm start   # tool calls as one line per group
CAPTAIN_INLINE=1 npm start              # inline, with the terminal's scrollback
CAPTAIN_PLAIN=1 npm start               # the plain readline chat
npm start -- --web                      # in a browser: prints the URL to open
```

Como aplicación de escritorio, desde `examples/captain-whiskers/desktop/`: `npm run build` y después `npm start` (sin empaquetar) o `npm run dist` (un asistente de instalación que pregunta dónde instalarlo).

Necesita Claude: una sesión con tu cuenta de Claude, o una API key. Si no has iniciado sesión y el entorno no tiene `ANTHROPIC_API_KEY`, el terminal ofrece iniciarla (`ensureClaudeAuth()`: Claude Code abre la página de Anthropic y guarda la sesión), y el navegador y la aplicación ofrecen lo mismo en la página (`startClaudeSignIn()`), o una API key. Nunca toma ni guarda el token de una cuenta de Claude: consulta [Autenticación](../getting-started/authentication.md#why-anthropics-terms).

## Ficheros {#files}

```text
examples/captain-whiskers/
├── captain.ts                  what makes him: texts, prompt, crew, spec, his config
├── agent.ts                    the terminal (and --web)
├── web/                        his web host on the chat controller, and its page
├── desktop/                    his Electron app and installer
├── guide.md                    his own help guide (commands, folders, settings)
├── extensions/                 his marketplace, shipyard (.claude-plugin/marketplace.json)
│   └── jokebook/                an installable extension: manifest, .mcp.json and its server, skill, command, parrot
├── package.json                "@falkenslab/agent-kit": "file:../.."
├── plugin/
│   ├── .claude-plugin/plugin.json   { "name": "captain-whiskers" }
│   ├── skills/pirate-joke/SKILL.md  how to build a pirate pun
│   ├── skills/miau/SKILL.md         keep the feline tone
│   ├── commands/joke.md             /captain-whiskers:joke
│   ├── commands/fresh-joke.md       /captain-whiskers:fresh-joke
│   ├── commands/stock-the-chest.md  /captain-whiskers:stock-the-chest
│   ├── commands/learn.md            /captain-whiskers:learn
│   └── commands/logbook-check.md    /captain-whiskers:logbook-check
└── treasure-samples/            a PPTX on knots and a DOCX of the ship's rules

~/.captain-whiskers/             his home and his project, the same for his three faces
├── config.json                  an API key if one was pasted, his language, the app's window
├── logbook/                     his knowledge base
├── treasure/                    his chest of originals
├── memory/                      what he remembers of you
├── extensions/                  the extensions installed for him
└── .run/                        one folder per run
```

## 1. Su clave y su idioma {#1-his-key-and-his-language}

```ts
// The environment's key wins; otherwise an API key pasted on his page, from his config.json.
await useSavedApiKey(home);

const { language } = detectLanguage();
```

El `config.json` de su casa guarda la API key pegada en su página (`apiKey`; el token de una cuenta de Claude se rechaza), el idioma elegido en su navegador o su aplicación y la ventana de la aplicación, escrito de modo que solo su usuario pueda leerlo. La sesión con la cuenta de Claude no está ahí: la guarda Claude Code. El ámbito de ficheros del kit mantiene al modelo lejos de él: `deniedPaths: [path.join(home, "config.json")]`.

`detectLanguage()` resuelve el idioma del kit (`--language` o, si no, el del sistema) para que el capitán pueda elegir sus propios textos: su nombre y sus textos en pantalla vienen en los cuatro idiomas, en un registro `TEXTS` indexado por idioma. Consulta [Idiomas](../sessions/languages.md#an-agents-own-texts).

## 2. El reloj del kit {#2-the-kits-clock}

El grumete del reloj necesita la hora y tiene que contar días. En lugar de darle `Bash` a un subagente, usa las propias herramientas de fecha y hora del kit, `current_time` y `date_math`, que tiene toda sesión (consulta [Las herramientas propias del kit](../capabilities/tools-and-mcp.md#date-and-time)). El capitán no registra ningún servidor MCP propio: para ver uno, consulta [Herramientas en proceso](../capabilities/tools-and-mcp.md#in-process-tools-tool-and-createsdkmcpserver).

## 3. Los prompts, en inglés {#3-the-prompts-in-english}

```ts
const SYSTEM_PROMPT = `You are ${text.name}, a retired pirate cat who now "commands" this terminal as if it
were the bridge of a ship. …

Your crew (subagents, launch them with the Agent tool):
- minino-buscachistes: if you're asked for a new or fresh joke, …, send them to find candidates on the web.
- jokebook:loro-critico (the parrot, from your jokebook): before telling a joke the kitten brought, pass them the one you like best. …
- grumete-del-reloj: if you're asked the time, the date or how long until something, ask them.

Be brief: 3-4 sentences per reply at most, always in character.`;
```

Todo lo que lee el modelo (prompts, skills, comandos) está en inglés, con el nombre del capitán en el idioma elegido: un texto en otro idioma arrastra las respuestas hacia él.

## 4. La tripulación {#4-the-crew}

```ts
const SUBAGENTS: Record<string, AgentDefinition> = {
  "minino-buscachistes": {
    description: "Kitten cabin boy who searches the web for short jokes about pirates, cats or sailors and returns candidates with their source.",
    prompt: `You are Minino, the youngest cabin boy on ${text.name}'s ship. …`,
    tools: ["WebSearch", "WebFetch"],
    model: "haiku",
    maxTurns: 8,
  },
  "grumete-del-reloj": {
    description: "Cabin boy who reads the ship's clock (the system's date and time) and works out dates and how long until something.",
    prompt: "You are the clock cabin boy. Read the ship's clock with the current_time tool, and work out any date … with the date_math tool …",
    tools: ["mcp__time__current_time", "mcp__time__date_math"],
    model: "haiku",
    maxTurns: 3,
  },
};
```

Dos subagentes pequeños sobre `haiku` en su código: uno busca en la web y el otro usa las herramientas de fecha y hora del kit. El tercero, el loro, solo piensa, y viene con la extensión `jokebook` como `agents/loro-critico.md`: una vez instalada, el kit lo registra como `jokebook:loro-critico`, igual que a los demás. Consulta [Subagentes](../capabilities/subagents.md#subagents-in-a-plugin).

## 5. La spec {#5-the-spec}

```ts
const JOKE_PAGE: PageType = {
  type: "joke",
  dir: "jokes",
  indexSection: "Jokes",
  description: "A joke the captain told or the crew found: the joke itself, where it comes from and the parrot's score (field score, 1-10).",
  template: `<The joke, word for word.>\n\n## Where it comes from\n- …\n\n## The parrot's verdict\n- …`,
  indexFields: ["score"],
};

const { version } = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8")) as { version: string };

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  identity: { name: text.name, version, description: "a retired pirate cat who tells jokes, an example agent of agent-kit" },
  buildMcpServers: () => ({}),
  pluginRoots: () => [path.join(__dirname, "plugin")],
  buildSubagents: () => ({ agents: SUBAGENTS, allowedSubagentTypes: Object.keys(SUBAGENTS) }),
  extensions: [
    awareness({ guide: path.join(__dirname, "guide.md") }),
    sources({ dir: (config) => path.join(config.projectDir, "treasure") }),
    knowledge({ dir: (config) => path.join(config.projectDir, "logbook"), pageTypes: [JOKE_PAGE] }),
    // Only through its tools, never read as a file.
    memory({ dir: (config) => path.join(config.projectDir, "memory") }),
  ],
  skills: "plugins",
  settingSources: [],
};
```

- `identity`, con la extensión `awareness` y su `guide`: el modelo conoce su nombre, su versión y la de agent-kit, qué es en cada momento (`about_me`), cómo se usa su chat (la skill `help`) y su `guide.md`. Consulta [Awareness](../capabilities/awareness.md).
- `extensions`: `awareness`, `sources` (su cofre, `treasure/`), `knowledge` (su cuaderno de bitácora, `logbook/`) y `memory` del kit, cada una creada con sus propias opciones; sus carpetas se calculan a partir del `projectDir` de la configuración, su casa. Su jokebook no está aquí: se instala (ver más abajo). Consulta [Extensiones](../extensions/overview.md).
- `pageTypes`: su cuaderno de bitácora tiene un tipo de página propio, `joke`, guardado en `logbook/jokes/` con la puntuación del loro en su línea del índice. Consulta [Tus propios tipos de página](../capabilities/knowledge-base.md#your-own-page-types).
- `skills: "plugins"` y `settingSources: []`: solo las skills de sus plugins (las suyas, las del cuaderno y las de awareness), no las veinte que trae el SDK, y nada de la configuración de Claude Code de la máquina. Consulta [Contexto y coste](../sessions/context-and-cost.md).

## 6. El chat {#6-the-chat}

```ts
const home = process.env.CAPTAIN_HOME || path.join(os.homedir(), ".captain-whiskers"); // everything he keeps
const runsDir = path.join(home, ".run");
const modes: Mode[] = ["autonomous", "guided", "interactive", "plan"];
const mode = modes.find((m) => m === process.env.CAPTAIN_MODE) ?? "guided";
await stockTheChest(path.join(home, "treasure")); // the samples, on the first start
const config: BaseSessionConfig = {
  mode,
  projectDir: home, // his home is his project: the model sees treasure/ (and logbook/ and memory/, through their tools)
  extensionDirs: { agent: path.join(home, "extensions") }, // one scope: his only project
  deniedPaths: [path.join(home, "config.json")], // an API key, if he was given one
};
const toolDetail = details.find((d) => d === process.env.CAPTAIN_TOOL_DETAIL) ?? "full";

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir,
  header: { title: text.name, fields: { [text.mode]: messagesFor(language).mode(mode), "agent-kit": agentKitVersion() }, art: LOGO },
  mode,
  theme: { accent: "#e5b53a", selection: "#e5b53a" },
  plain: process.env.CAPTAIN_PLAIN === "1",
  toolDetail,
  fullscreen: process.env.CAPTAIN_INLINE !== "1",
  firstPromptSuggestion: text.suggestion,
  welcomeMessage: pc.gray(text.welcome),
  promptLabel: `\n${ui.user(text.you)} `,
  agentLabel: ui.agent(`${text.name}>`),
  historyPath: path.join(runsDir, "history.jsonl"),
});
```

- **Un abridor de sesión con `runsDir`**: cada ejecución en `~/.captain-whiskers/.run/<timestamp>/`, que se puede reanudar con `--continue` o `/resume`.
- **La cabecera**: el nombre traducido, el modo en el idioma del kit, la versión de agent-kit sobre la que se ejecuta (`agentKitVersion()`) y un logotipo con caracteres de bloque de una columna.
- **Un tema**: el borde de los paneles de aprobación y la opción enfocada en oro de doblón; todo lo demás conserva los colores del kit.
- **La primera sugerencia**: Tab la acepta antes del primer turno.
- **Guiado por defecto**, para que pueda preguntar: qué tipo de chiste (`ask_human`), un fichero (`request_file`), si retirar un original.

## 7. En un navegador y en el escritorio {#7-in-a-browser-and-on-the-desktop}

El terminal es una de sus tres caras; las tres son vistas del [controlador del chat](../advanced/custom-hosts.md#the-chat-controller) del kit, y ninguna de las gráficas es del kit: son suyas, como establece el [ADR-026](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-026-graphical-interface.md).

- **`web/server.ts`** (unas 320 líneas): su jokebook instalado en el primer arranque, las acciones del panel lateral de extensiones (el catálogo, instalar, actualizar, desinstalar, ajustes, reabrir) sobre las del controlador, un controlador con `panels: "state"`, un servidor HTTP en `127.0.0.1` con un token en la URL, el estado mediante server-sent events, las acciones de la persona mediante `POST`, una ventana cada vez, subidas para `request_file`, ficheros añadidos a su cofre a través de la `api` de la extensión `sources` (`chat.api("sources").addSource`), el idioma cambiado con el `setLanguage()` del controlador y guardado en el `config.json` de su casa, y el inicio de sesión desde la página cuando no puede llegar a Claude: con la cuenta de Claude mediante `startClaudeSignIn()` (un enlace a la página de Anthropic por si el navegador no se abrió, un cuadro para el código que muestra, el chat en cuanto `done` lo dice), o con una API key, guardada en `config.json`.
- **`web/index.html`**: una página, sin dependencias ni compilación: la conversación dibujada bloque a bloque (solo lo que cambia), las llamadas a herramientas plegadas con un spinner mientras se ejecutan, las aprobaciones, elecciones y planes como diálogos, un menú de comandos con `/` (los suyos, los de sus extensiones y los del chat, a partir de los `commandDetails` del estado), acciones rápidas y el idioma arriba, ficheros soltados o adjuntados para llenar su cofre, el modo con lo que significa cada uno, las conversaciones anteriores y las extensiones en paneles laterales, tema claro y oscuro, y diseño adaptado a un móvil.
- **`desktop/main.mjs`**: Electron alrededor de esa página. El proceso principal arranca el host web con un token que nunca sale de él, desde su misma casa (la carpeta de datos propia de Electron solo guarda sus cachés), guarda la posición de la ventana en su `config.json` y abre los enlaces en el navegador; nada más, así que la aplicación es exactamente su web. Empaquetada con `electron-builder` y solo `asarUnpack`: el kit [funciona empaquetado](../advanced/custom-hosts.md#packaging-an-electron-app) por sí solo.

`captain.ts` es lo que comparten las tres: sus textos, su prompt, su tripulación y su spec, y `createCaptain({ home })`, su configuración y su abridor de sesión para su casa (`CAPTAIN_HOME`, o `~/.captain-whiskers`), y su `config.json`. El abridor construye la spec cada vez que abre una sesión, en el idioma de ese momento, así que cambiar de idioma también le cambia el nombre.

## 8. El cuaderno de bitácora y el cofre {#8-the-logbook-and-the-chest}

`logbook/` es su [base de conocimiento](../capabilities/knowledge-base.md), a la que solo se llega mediante las herramientas `knowledge_*`; `treasure/` es su cofre de [originales](../capabilities/knowledge-base.md#sources-originals-kept-as-obtained). Su prompt y sus comandos los ponen a trabajar:

- `/captain-whiskers:learn` ingiere el cofre: `list_sources` y `knowledge_index` para ver qué le falta al cuaderno, `extract_text` sobre el PPTX (notas del orador incluidas) y el DOCX, una sola llamada a `knowledge_create` para un resumen y los conceptos que alimenta, y `knowledge_log`.
- Un chiste nuevo se convierte en una página `joke`, con la puntuación del loro cuando el jokebook está instalado; `/jokebook:best-jokes` los clasifica y archiva la clasificación como una síntesis.
- `/captain-whiskers:stock-the-chest` descarga dos páginas (`download_to_sources`, guardadas también como markdown) y pide un libro de chistes (`request_file`).
- "Ese documento era el equivocado" termina en `retire_source`, con aprobación, y después en `knowledge_retire` para su resumen, con otra.
- `/captain-whiskers:logbook-check` ejecuta `knowledge_check`.

Las bibliotecas opcionales para DOCX, PPTX y páginas web están en su `package.json` (consulta [Instalación](../getting-started/installation.md#optional-libraries)).

## Cosas que probar {#things-to-try}

Su README tiene un guion de pruebas que recorre cada funcionalidad en orden. Algunas:

- `/captain-whiskers:joke` para un clásico, `/captain-whiskers:fresh-joke` para mandar a la tripulación a la web.
- "¿Qué hora es y cuánto falta para el Día Internacional de Hablar como un Pirata?" (el grumete del reloj, con `current_time` y `date_math`).
- "Organiza y lleva a cabo una búsqueda del tesoro de 4 pasos, paso a paso": una lista de tareas bajo el spinner.
- `/plan` y después "Planifica una fiesta pirata": el plan en un panel, y *Ejecutarlo* sale del modo plan.
- `CAPTAIN_MODE=interactive npm start` y observa cómo cada llamada a herramienta se detiene en el panel de aprobación; Shift+Tab cambia a plan y después a guiado.
- `CAPTAIN_MODE=plan npm start` y pídele algo: la tripulación puede buscar y leer el reloj y el cuaderno, y todo lo demás se deniega hasta que se apruebe el plan o salgas del modo plan.
- "¿Cómo reanudo una conversación?" o "¿Qué hace Shift+Tab?": responde a partir de la skill `help`; "¿En qué modo estás?" o "¿Qué sabes hacer?", a partir de `about_me`.
- Ctrl+O para plegar las llamadas a herramientas; arrastra y haz clic derecho para copiar; `?` para los atajos.
- "A partir de ahora, termina siempre tus respuestas con: ¡Yo-ho, marinero de agua dulce!", después `/exit` y `npm start`: una página `preference`, y la nueva sesión la sigue.
- `/exit` y después `npm start -- --continue`.
