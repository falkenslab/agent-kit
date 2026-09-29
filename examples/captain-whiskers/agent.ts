import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import {
  buildSessionOptions,
  createSdkMcpServer,
  detectLanguage,
  messagesFor,
  runChatInk,
  ensureClaudeAuth,
  tool,
  ui,
  type AgentDefinition,
  type AgentSpec,
  type BaseSessionConfig,
  type Language,
  type Mode,
} from "@falkenslab/agent-kit";

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

// El reloj del barco: una herramienta propia (un servidor MCP en el mismo proceso) que solo
// lee la fecha y la hora, en lugar de darle Bash al grumete del reloj.
const clock = createSdkMcpServer({
  name: "clock",
  version: "1.0.0",
  tools: [
    tool(
      "current_time",
      "The system's current date and time: ISO 8601 in UTC, the local date and time, the time zone and the day of the week.",
      {},
      async () => {
        const now = new Date();
        const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
        const local = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "long", timeZone }).format(now);
        return { content: [{ type: "text" as const, text: JSON.stringify({ utc: now.toISOString(), local, timeZone }) }] };
      },
      { annotations: { readOnlyHint: true } },
    ),
  ],
});

// Todo lo que lee el modelo (prompts, skills, comandos) va en inglés: un texto en español
// arrastra las respuestas al español aunque el kit pida otro idioma (comprobado), y así el
// capitán contesta en el idioma del kit. Su nombre sí cambia con el idioma.
const SYSTEM_PROMPT = `You are ${text.name}, a retired pirate cat who now "commands" this terminal as if it
were the bridge of a ship. You always talk in sailor slang with absurd drama, treat any request
from the user as a "mission" and any web search as "checking the treasure map".

Your crew (subagents, launch them with the Agent tool):
- minino-buscachistes: if you're asked for a new or fresh joke, or one you don't know, send them
  to find candidates on the web. For the classics, use your own pirate-joke skill.
- loro-critico: before telling a joke the kitten brought, pass them the one you like best. If
  it scores below 6, ask the kitten for another batch, only once.
- grumete-del-reloj: if you're asked the time, the date or how long until something, ask them.

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
  "loro-critico": {
    description: "Grumpy parrot who scores a joke from 1 to 10 and suggests how to improve it. Uses no tools.",
    prompt: `You are Perico, ${text.name}'s grumpy parrot. You're given a joke: score it from 1 to 10
with one sentence of justification and, if it's below 8, one concrete improvement in one line.
Answer in a cranky parrot's tone, in 3 lines at most.`,
    tools: [],
    model: "haiku",
    maxTurns: 1,
  },
  "grumete-del-reloj": {
    description: "Cabin boy who reads the ship's clock (the system's date and time) and does time arithmetic.",
    prompt: `You are the clock cabin boy. To answer, read the ship's clock with the current_time tool and
do any time arithmetic yourself. Return the answer in one line, without frills.`,
    tools: ["mcp__clock__current_time"],
    model: "haiku",
    maxTurns: 3,
  },
};

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildMcpServers: () => ({ clock }),
  // Las skills pirate-joke y miau y los comandos /captain-whiskers:joke y
  // /captain-whiskers:fresh-joke (con el nombre del plugin).
  pluginRoots: () => [path.join(__dirname, "plugin")],
  buildSubagents: () => ({ agents: SUBAGENTS, allowedSubagentTypes: Object.keys(SUBAGENTS) }),
  disallowedTools: ["Read", "Write", "Glob"],
  // Solo sus propias skills (los comandos del plugin siguen funcionando sin estar en la
  // lista) y ninguna configuración de Claude Code de quien lo ejecute: ~11k tokens por
  // llamada en vez de ~16k.
  skills: ["captain-whiskers:pirate-joke", "captain-whiskers:miau"],
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

  // Cada ejecución en su carpeta de .run/ (ignorada por git): su log, su transcripción y la
  // conversación, para retomarla con --continue (la última) o /resume (a elegir).
  const runsDir = path.join(__dirname, ".run");

  // Autónomo por defecto; CAPTAIN_MODE=interactive pide permiso antes de cada herramienta
  // (útil para ver los paneles de aprobación) y CAPTAIN_MODE=guided solo antes de publicar.
  const modes: Mode[] = ["autonomous", "guided", "interactive"];
  const mode = modes.find((m) => m === process.env.CAPTAIN_MODE) ?? "autonomous";

  const config: BaseSessionConfig = {
    mode,
    projectDir: __dirname,
  };

  // Interfaz Ink a pantalla completa (CAPTAIN_INLINE=1: en línea, con el historial de la
  // terminal); sin TTY, o con CAPTAIN_PLAIN=1, el chat de readline. Recibe cómo abrir la
  // sesión de una carpeta de ejecución, porque /resume la vuelve a abrir en otra. Shift+Tab
  // alterna guided e interactive (una sesión autónoma no puede cambiar).
  await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
    runsDir,
    // El nombre del modo, en el idioma del kit (el mismo que en la barra de estado).
    header: { title: text.name, fields: { [text.mode]: messagesFor(language).mode(mode) }, art: LOGO },
    mode,
    plain: process.env.CAPTAIN_PLAIN === "1",
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
