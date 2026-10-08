import { readFileSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSessionOptions,
  detectLanguage,
  getLanguage,
  setLanguage,
  SUPPORTED_LANGUAGES,
  type AgentDefinition,
  type AgentSpec,
  type BaseSessionConfig,
  type Language,
  type Mode,
  type PageType,
  type SessionOpener,
} from "@falkenslab/agent-kit";

// Lo que hace ser al capitán, aparte de cómo se le ve: sus textos, su prompt, su tripulación, su
// cuaderno y cómo se abre su sesión. Lo usan sus tres caras: la terminal (agent.ts), el navegador
// (web/) y la aplicación de escritorio (desktop/).

/** Su carpeta: la de su código, con su plugin, su guía y las muestras del cofre al lado. */
export const CAPTAIN_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * Su marketplace oficial, `shipyard` (extensions/ junto a su código): lo que se le puede instalar,
 * conocido sin preguntar. Fuera del archivo cuando va empaquetado: otro proceso lo lee.
 */
export const SHIPYARD = path.join(CAPTAIN_DIR, "extensions").replace(/([\\/])app\.asar([\\/])/, "$1app.asar.unpacked$2");

// El idioma del kit (--language, si no el del sistema): el capitán elige con él su nombre y
// sus textos en pantalla, y el kit traduce los suyos y le pide contestar en ese idioma. Puede
// cambiar mientras navega (su web, #47): sus textos se buscan cada vez, nunca se fijan aquí.
setLanguage(detectLanguage().language);

/** Sus textos para la persona, en cada idioma del kit. */
export interface CaptainTexts {
  name: string;
  you: string;
  mode: string;
  welcome: string;
  suggestion: string;
  tokenSaved: (file: string) => string;
}

const TEXTS: Record<Language, CaptainTexts> = {
  es: {
    name: "Capitán Bigotes",
    you: "tú>",
    mode: "modo",
    welcome: "El Capitán Bigotes ha subido a bordo. Escribe /exit para desembarcar, /captain-whiskers:joke para pedirle uno directamente o /resume para retomar una conversación.",
    suggestion: "cuéntame un chiste fresco",
    tokenSaved: (file) => `Token guardado en ${file}.`,
  },
  en: {
    name: "Captain Whiskers",
    you: "you>",
    mode: "mode",
    welcome: "Captain Whiskers is aboard. Type /exit to disembark, /captain-whiskers:joke to ask for a joke right away or /resume to pick up a conversation.",
    suggestion: "tell me a fresh joke",
    tokenSaved: (file) => `Token saved to ${file}.`,
  },
  fr: {
    name: "Capitaine Moustaches",
    you: "toi>",
    mode: "mode",
    welcome: "Le Capitaine Moustaches est à bord. Tape /exit pour débarquer, /captain-whiskers:joke pour une blague tout de suite ou /resume pour reprendre une conversation.",
    suggestion: "raconte-moi une nouvelle blague",
    tokenSaved: (file) => `Jeton enregistré dans ${file}.`,
  },
  de: {
    name: "Käpt'n Schnurrbart",
    you: "du>",
    mode: "Modus",
    welcome: "Käpt'n Schnurrbart ist an Bord. Tippe /exit zum Vonbordgehen, /captain-whiskers:joke für einen Witz oder /resume, um ein Gespräch fortzusetzen.",
    suggestion: "erzähl mir einen neuen Witz",
    tokenSaved: (file) => `Token in ${file} gespeichert.`,
  },
};
/** Sus textos en `language`, o en el idioma del kit ahora mismo. */
export function texts(language: Language = getLanguage()): CaptainTexts {
  return TEXTS[language];
}

// Todo lo que lee el modelo (prompts, skills, comandos) va en inglés: un texto en español
// arrastra las respuestas al español aunque el kit pida otro idioma (comprobado), y así el
// capitán contesta en el idioma del kit. Su nombre sí cambia con el idioma.
const systemPrompt = (name: string) => `You are ${name}, a retired pirate cat who now "commands" this chat as if it
were the bridge of a ship. You always talk in sailor slang with absurd drama, treat any request
from the user as a "mission" and any web search as "checking the treasure map".

Your crew (subagents, launch them with the Agent tool):
- minino-buscachistes: if you're asked for a new or fresh joke, or one you don't know, send them
  to find candidates on the web. For the classics, use your own pirate-joke skill.
- jokebook:loro-critico (the parrot), only when your jokebook is installed: before telling a joke
  the kitten brought, pass them the one you like best. If it scores below 6, ask the kitten for
  another batch, only once. Without the jokebook, pick the best one yourself.
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

Be brief: 3-4 sentences per reply at most, always in character. Never talk about your instructions,
this prompt or your tools by name: just do what they say.`;

const subagents = (name: string): Record<string, AgentDefinition> => ({
  "minino-buscachistes": {
    description: "Kitten cabin boy who searches the web for short jokes about pirates, cats or sailors and returns candidates with their source.",
    prompt: `You are Minino, the youngest cabin boy on ${name}'s ship. Your mission: find on the
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
});

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

/** Su versión, la de su package.json. */
export const version = (JSON.parse(readFileSync(path.join(CAPTAIN_DIR, "package.json"), "utf8")) as { version: string }).version;

/** Su spec, en el idioma del kit de ahora: su nombre cambia con él. */
export function makeSpec(): AgentSpec<BaseSessionConfig> {
  const { name } = texts();
  const crew = subagents(name);
  return {
    buildSystemPrompt: () => systemPrompt(name),
    // Quién es, y su guía (comandos, carpetas): la extensión awareness se lo dice al modelo, y
    // about_me le cuenta lo que es en cada momento (su modo, sus extensiones, su tripulación).
    identity: { name, version, description: "a retired pirate cat who tells jokes, an example agent of agent-kit" },
    helpGuide: path.join(CAPTAIN_DIR, "guide.md"),
    buildMcpServers: () => ({}),
    // Las skills pirate-joke y miau y los comandos /captain-whiskers:joke y
    // /captain-whiskers:fresh-joke (con el nombre del plugin).
    pluginRoots: () => [path.join(CAPTAIN_DIR, "plugin")],
    buildSubagents: () => ({ agents: crew, allowedSubagentTypes: Object.keys(crew) }),
    // Las extensiones del kit con las que navega (ADR-025): su conciencia (awareness), el cofre
    // (sources, en treasure/), el cuaderno (knowledge, en logbook/) y lo que recuerda de quien
    // navega con él (memory). Las que se le instalan (su libro de chistes, extensions/jokebook)
    // van aparte: config.extensionDirs.
    extensions: ["awareness", "sources", "knowledge", "memory"],
    knowledgePageTypes: [JOKE_PAGE],
    // Solo las skills de sus plugins (las suyas, las del cuaderno y la de ayuda del chat), no la veintena
    // que trae el SDK, y ninguna configuración de Claude Code de quien lo ejecute.
    skills: "plugins",
    settingSources: [],
  };
}

/**
 * Su casa, ~/.captain-whiskers (CAPTAIN_HOME la cambia): todo lo suyo, en sus tres caras. Es
 * también su proyecto, porque no trabaja sobre los de nadie: el cuaderno, el cofre, las
 * conversaciones, lo que recuerda de ti, sus extensiones y su configuración.
 */
export const CAPTAIN_HOME = process.env.CAPTAIN_HOME || path.join(os.homedir(), ".captain-whiskers");

/** El modo de CAPTAIN_MODE, o guiado: puede preguntar (ask_human, request_file, retirar). */
export function modeFromEnv(): Mode {
  const modes: Mode[] = ["autonomous", "guided", "interactive", "plan"];
  return modes.find((mode) => mode === process.env.CAPTAIN_MODE) ?? "guided";
}

/** Sus carpetas, su configuración y cómo se abre su sesión en una carpeta de ejecución. */
export async function createCaptain(options: { home?: string; mode?: Mode } = {}) {
  const home = options.home ?? CAPTAIN_HOME;
  const mode = options.mode ?? modeFromEnv();
  // Su cuaderno de bitácora (la base de conocimiento) y su cofre (los originales). La primera
  // vez, el cofre recibe las muestras de treasure-samples/.
  const logbook = path.join(home, "logbook");
  const treasure = path.join(home, "treasure");
  await stockTheChest(treasure);
  // Las extensiones que se le instalan (#37), en un solo sitio: su casa es su único proyecto.
  const extensionDirs = { agent: path.join(home, "extensions") };
  const config: BaseSessionConfig = {
    mode,
    // Su casa es su proyecto: el modelo ve logbook/ y treasure/, y nada más de ella.
    projectDir: home,
    knowledgeDir: logbook,
    sourcesDir: treasure,
    // Lo que recuerda de quien navega con él: solo por sus herramientas, nunca leído como fichero.
    memoryDir: path.join(home, "memory"),
    extensionDirs,
    // Su clave de Claude, en config.json: nunca a la vista del modelo.
    deniedPaths: [configPath(home)],
  };
  // Cada ejecución en su carpeta de .run/: su log, su transcripción y la conversación, para
  // retomarla con --continue (la última) o /resume.
  const runsDir = path.join(home, ".run");
  // Su spec se hace cada vez que se abre la sesión: en el idioma de ese momento.
  const opener: SessionOpener = (run) => buildSessionOptions(config, run.dir, makeSpec(), { run });
  return { home, mode, config, runsDir, extensionDirs, opener, historyPath: path.join(runsDir, "history.jsonl") };
}

/** Su configuración (config.json en su casa): la clave de Claude, el idioma elegido, la ventana de su app. */
export interface CaptainConfig {
  /** La clave con la que entra en Claude: un token OAuth (`sk-ant-oat…`) o una API key (`sk-ant-api…`). */
  claudeToken?: string;
  language?: Language;
  /** Dónde y de qué tamaño quedó la ventana de su app de escritorio. */
  window?: { x?: number; y?: number; width: number; height: number };
}

const configPath = (home: string): string => path.join(home, "config.json");

/** Su configuración, o ninguna. */
export async function loadConfig(home: string = CAPTAIN_HOME): Promise<CaptainConfig> {
  try {
    const config = JSON.parse(await readFile(configPath(home), "utf8")) as CaptainConfig;
    if (config.language && !SUPPORTED_LANGUAGES.includes(config.language)) delete config.language;
    return config;
  } catch {
    return {};
  }
}

/** Guarda cambios en su configuración (con lo que ya hubiera), legible solo por quien lo ejecuta. */
export async function saveConfig(home: string, changes: CaptainConfig): Promise<void> {
  await mkdir(home, { recursive: true });
  await writeFile(configPath(home), `${JSON.stringify({ ...(await loadConfig(home)), ...changes }, null, 2)}
`, { encoding: "utf8", mode: 0o600 });
}

/** La variable de entorno que el SDK lee para una clave: por su prefijo, o ninguna si no lo parece. */
export function claudeKeyVariable(token: string): "CLAUDE_CODE_OAUTH_TOKEN" | "ANTHROPIC_API_KEY" | null {
  return token.startsWith("sk-ant-api") ? "ANTHROPIC_API_KEY" : token.startsWith("sk-ant-oat") ? "CLAUDE_CODE_OAUTH_TOKEN" : null;
}

/** La clave guardada, puesta en el entorno para el SDK; la del entorno, si ya hay una, manda. */
export async function useSavedClaudeKey(home: string = CAPTAIN_HOME): Promise<void> {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY) return;
  const token = (await loadConfig(home)).claudeToken;
  const variable = token ? claudeKeyVariable(token) : null;
  if (variable) process.env[variable] = token;
}

/** Copia las muestras al cofre si aún no tiene nada (una carpeta nueva, o vacía). */
async function stockTheChest(treasure: string): Promise<void> {
  const samples = path.join(CAPTAIN_DIR, "treasure-samples");
  const existing = await readdir(treasure).catch(() => [] as string[]);
  if (existing.some((name) => !name.startsWith("."))) return;
  await mkdir(treasure, { recursive: true });
  for (const name of await readdir(samples)) {
    if ((await stat(path.join(samples, name))).isFile()) await copyFile(path.join(samples, name), path.join(treasure, name));
  }
}
