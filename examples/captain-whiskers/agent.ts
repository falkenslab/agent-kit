import { readFileSync } from "node:fs";
import { appendFile, copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import {
  agentKitVersion,
  buildSessionOptions,
  detectLanguage,
  messagesFor,
  runChatInk,
  ensureClaudeAuth,
  ui,
  type AgentDefinition,
  type AgentSpec,
  type BaseSessionConfig,
  type Language,
  type Mode,
  type PageType,
  type ToolDetail,
} from "@falkenslab/agent-kit";
import { jokebookExtension } from "./jokebook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Node no carga .env por su cuenta. Se lee antes que nada (CAPTAIN_* incluidas); lo que ya
// esté en el entorno manda sobre el fichero, y sin .env todo sigue igual.
const envPath = path.join(__dirname, ".env");
try {
  process.loadEnvFile(envPath);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

// El idioma del kit (--language, si no el del sistema): el capitán elige con él su nombre y
// sus textos en pantalla, y el kit traduce los suyos y le pide contestar en ese idioma.
const { language } = detectLanguage();

/** Los textos propios del capitán en cada idioma del kit. */
const TEXTS: Record<Language, { name: string; you: string; mode: string; welcome: string; suggestion: string; tokenSaved: (file: string) => string }> = {
  es: {
    name: "Capitán Bigotes",
    you: "tú>",
    mode: "modo",
    welcome: "El Capitán Bigotes ha subido a bordo. Escribe /exit para desembarcar, /captain-whiskers:joke para pedirle uno directamente o /resume para retomar una conversación.",
    suggestion: "cuéntame un chiste fresco",
    tokenSaved: (file) => `Token guardado en ${file} (ignorado por git).`,
  },
  en: {
    name: "Captain Whiskers",
    you: "you>",
    mode: "mode",
    welcome: "Captain Whiskers is aboard. Type /exit to disembark, /captain-whiskers:joke to ask for a joke right away or /resume to pick up a conversation.",
    suggestion: "tell me a fresh joke",
    tokenSaved: (file) => `Token saved to ${file} (ignored by git).`,
  },
  fr: {
    name: "Capitaine Moustaches",
    you: "toi>",
    mode: "mode",
    welcome: "Le Capitaine Moustaches est à bord. Tape /exit pour débarquer, /captain-whiskers:joke pour une blague tout de suite ou /resume pour reprendre une conversation.",
    suggestion: "raconte-moi une nouvelle blague",
    tokenSaved: (file) => `Jeton enregistré dans ${file} (ignoré par git).`,
  },
  de: {
    name: "Käpt'n Schnurrbart",
    you: "du>",
    mode: "Modus",
    welcome: "Käpt'n Schnurrbart ist an Bord. Tippe /exit zum Vonbordgehen, /captain-whiskers:joke für einen Witz oder /resume, um ein Gespräch fortzusetzen.",
    suggestion: "erzähl mir einen neuen Witz",
    tokenSaved: (file) => `Token in ${file} gespeichert (von git ignoriert).`,
  },
};
const text = TEXTS[language];

// Todo lo que lee el modelo (prompts, skills, comandos) va en inglés: un texto en español
// arrastra las respuestas al español aunque el kit pida otro idioma (comprobado), y así el
// capitán contesta en el idioma del kit. Su nombre sí cambia con el idioma.
const SYSTEM_PROMPT = `You are ${text.name}, a retired pirate cat who now "commands" this terminal as if it
were the bridge of a ship. You always talk in sailor slang with absurd drama, treat any request
from the user as a "mission" and any web search as "checking the treasure map".

Your crew (subagents, launch them with the Agent tool):
- minino-buscachistes: if you're asked for a new or fresh joke, or one you don't know, send them
  to find candidates on the web. For the classics, use your own pirate-joke skill.
- jokebook:loro-critico (the parrot, from your jokebook): before telling a joke the kitten brought, pass them the one you like best. If
  it scores below 6, ask the kitten for another batch, only once.
- grumete-del-reloj: if you're asked the time, the date or how long until something (Talk Like a
  Pirate Day is 19 September), ask them.

Your logbook is your knowledge base: everything you learn from the treasure chest (your sources
folder) and every joke the parrot scored goes there, as a \`joke\` page with the parrot's score in
the field \`score\` (search it first: don't note the same joke twice).

When you're asked for a joke without saying which kind, ask with ask_human: a classic (your
pirate-joke skill), a fresh one (the kitten) or one from the logbook.

For a mission with more than three steps (a treasure hunt, a party), keep a task list with
TodoWrite and tick it off as you go. In plan mode, when the plan is ready, present it with
present_plan.

Be brief: 3-4 sentences per reply at most, always in character.`;

const SUBAGENTS: Record<string, AgentDefinition> = {
  "minino-buscachistes": {
    description: "Kitten cabin boy who searches the web for short jokes about pirates, cats or sailors and returns candidates with their source.",
    prompt: `You are Minino, the youngest cabin boy on ${text.name}'s ship. Your mission: find on the
web 2 or 3 short, clean jokes (about pirates, cats or sailors), preferably in the language the
captain's request is written in. Use WebSearch (3 searches at most) and WebFetch only if you need
to open a page. Return only a numbered list with each joke as it is and the URL it comes from.
Nothing offensive; if you find nothing decent, say so.`,
    tools: ["WebSearch", "WebFetch"],
    model: "haiku",
    maxTurns: 8,
  },
  "grumete-del-reloj": {
    description: "Cabin boy who reads the ship's clock (the system's date and time) and works out dates and how long until something.",
    prompt: `You are the clock cabin boy. Read the ship's clock with the current_time tool, and work out
any date or "how long until" with the date_math tool instead of counting yourself. Return the
answer in one line, without frills.`,
    // Las herramientas de fecha y hora del kit (servidor "time"), las mismas para todo agente.
    tools: ["mcp__time__current_time", "mcp__time__date_math"],
    model: "haiku",
    maxTurns: 3,
  },
};

// Un tipo de página propio de su cuaderno: los chistes, con la nota del loro en el índice.
const JOKE_PAGE: PageType = {
  type: "joke",
  dir: "jokes",
  indexSection: "Jokes",
  description: "A joke the captain told or the crew found: the joke itself, where it comes from and the parrot's score (field score, 1-10).",
  template: `<The joke, word for word.>

## Where it comes from
- <The captain's own, the pirate-joke skill, or the URL the kitten found it at.>

## The parrot's verdict
- <The score and the parrot's comment.>`,
  indexFields: ["score"],
};

// Su versión, la de su package.json.
const { version } = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8")) as { version: string };

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  // Quién es: el kit se lo dice al modelo (con la versión de agent-kit) y le da la skill
  // agent-help, que responde cómo se usa el chat y, con guide.md, sus comandos y carpetas.
  identity: { name: text.name, version, description: "a retired pirate cat who tells jokes, an example agent of agent-kit" },
  helpGuide: path.join(__dirname, "guide.md"),
  buildMcpServers: () => ({}),
  // Las skills pirate-joke y miau y los comandos /captain-whiskers:joke y
  // /captain-whiskers:fresh-joke (con el nombre del plugin).
  pluginRoots: () => [path.join(__dirname, "plugin")],
  buildSubagents: () => ({ agents: SUBAGENTS, allowedSubagentTypes: Object.keys(SUBAGENTS) }),
  // El cuaderno (logbook/) se lleva con las herramientas knowledge_* del kit; Read, Glob y Grep
  // solo llegan al cofre (treasure/), y nada puede escribir en él.
  // Las extensiones con las que navega (ADR-025): el cofre (sources, en treasure/) y el cuaderno
  // (knowledge, en logbook/), que son del kit, y su libro de chistes, que es suyo.
  extensions: ["sources", "knowledge", "memory", jokebookExtension],
  knowledgePageTypes: [JOKE_PAGE],
  // Solo las skills de sus plugins (las suyas, las del cuaderno y agent-help), no la veintena
  // que trae el SDK, y ninguna configuración de Claude Code de quien lo ejecute.
  skills: "plugins",
  settingSources: [],
};

// El logo de la cabecera: un gato con sombrero pirata y parche. Solo caracteres de una
// columna (ASCII y bloques): un emoji descuadraría el título que va a su derecha.
const LOGO = [
  pc.gray("   ▄▄███▄▄"),
  pc.gray("  ▀▀▀▀▀▀▀▀▀"),
  pc.yellow("    /\\_/\\"),
  `${pc.yellow("   ( o.")}${pc.gray("█")}${pc.yellow(" )")}`,
  pc.yellow("    > ^ <"),
];

async function main(): Promise<void> {
  // Sin CLAUDE_CODE_OAUTH_TOKEN/ANTHROPIC_API_KEY (en el entorno o en .env) ofrece generar
  // un token. El kit no lo guarda: lo devuelve, y aquí se añade a .env para la próxima vez.
  const newToken = await ensureClaudeAuth();
  if (newToken) {
    const previous = await readFile(envPath, "utf8").catch(() => "");
    const separator = previous && !previous.endsWith("\n") ? "\n" : "";
    await appendFile(envPath, `${separator}CLAUDE_CODE_OAUTH_TOKEN=${newToken}\n`);
    console.log(ui.dim(text.tokenSaved(envPath)));
  }

  // Todo lo que guarda vive en workspace/ (ignorado por git), su proyecto: así la carpeta del
  // capitán solo tiene su código. Cada ejecución en su carpeta de workspace/.run/: su log, su
  // transcripción y la conversación, para retomarla con --continue (la última) o /resume.
  const workspace = path.join(__dirname, "workspace");
  const runsDir = path.join(workspace, ".run");

  // Guiado por defecto, para que pueda preguntar (ask_human, request_file, retirar);
  // CAPTAIN_MODE=interactive pide permiso antes de cada herramienta, CAPTAIN_MODE=plan solo lee
  // y planea hasta que se sale del modo, y CAPTAIN_MODE=autonomous no pregunta nada.
  const modes: Mode[] = ["autonomous", "guided", "interactive", "plan"];
  const mode = modes.find((m) => m === process.env.CAPTAIN_MODE) ?? "guided";

  // Su cuaderno de bitácora (la base de conocimiento) y su cofre (los originales), en el
  // espacio de trabajo. La primera vez, el cofre recibe las muestras de treasure-samples/.
  const logbook = path.join(workspace, "logbook");
  const treasure = path.join(workspace, "treasure");
  await stockTheChest(treasure);

  const config: BaseSessionConfig = {
    mode,
    // El proyecto es el espacio de trabajo: el modelo ve logbook/ y treasure/, como siempre.
    projectDir: workspace,
    knowledgeDir: logbook,
    sourcesDir: treasure,
    // Lo que recuerda de quien navega con él, en todos sus proyectos: fuera de este, en su
    // carpeta de usuario y solo suya (CAPTAIN_MEMORY_DIR la cambia, p. ej. para probar).
    memoryDir: process.env.CAPTAIN_MEMORY_DIR || path.join(os.homedir(), ".captain-whiskers", "memory"),
  };

  // Cuánto de las herramientas enseña el chat: CAPTAIN_TOOL_DETAIL=full (por defecto), calls
  // o summary.
  const details: ToolDetail[] = ["full", "calls", "summary"];
  const toolDetail = details.find((d) => d === process.env.CAPTAIN_TOOL_DETAIL) ?? "full";

  // Interfaz Ink a pantalla completa (CAPTAIN_INLINE=1: en línea, con el historial de la
  // terminal); sin TTY, o con CAPTAIN_PLAIN=1, el chat de readline. Recibe cómo abrir la
  // sesión de una carpeta de ejecución, porque /resume la vuelve a abrir en otra. Shift+Tab
  // recorre guided, interactive y plan (una sesión autónoma no puede cambiar).
  await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
    runsDir,
    // El nombre del modo, en el idioma del kit (el mismo que en la barra de estado), y la
    // versión de agent-kit con la que navega.
    header: { title: text.name, fields: { [text.mode]: messagesFor(language).mode(mode), "agent-kit": agentKitVersion() }, art: LOGO },
    mode,
    // Su tema: solo cambia estos roles; el resto sigue con los colores del kit. El borde de
    // los paneles de aprobación y la opción elegida en las listas, en dorado de doblón.
    theme: { accent: "#e5b53a", selection: "#e5b53a" },
    plain: process.env.CAPTAIN_PLAIN === "1",
    toolDetail,
    fullscreen: process.env.CAPTAIN_INLINE !== "1",
    // La primera sugerencia (Tab la acepta): el modelo solo sugiere a partir del segundo turno.
    firstPromptSuggestion: text.suggestion,
    welcomeMessage: pc.gray(text.welcome),
    promptLabel: `\n${ui.user(text.you)} `,
    agentLabel: ui.agent(`${text.name}>`),
    // Fuera de las carpetas de ejecución para que el historial de ↑/↓ sobreviva entre sesiones.
    historyPath: path.join(runsDir, "history.jsonl"),
  });
}

/** Copia las muestras al cofre si aún no tiene nada (una carpeta nueva, o vacía). */
async function stockTheChest(treasure: string): Promise<void> {
  const samples = path.join(__dirname, "treasure-samples");
  const existing = await readdir(treasure).catch(() => [] as string[]);
  if (existing.some((name) => !name.startsWith("."))) return;
  await mkdir(treasure, { recursive: true });
  for (const name of await readdir(samples)) {
    if ((await stat(path.join(samples, name))).isFile()) await copyFile(path.join(samples, name), path.join(treasure, name));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
