import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import {
  buildSessionOptions,
  runChatInk,
  ensureClaudeAuth,
  ui,
  type AgentDefinition,
  type AgentSpec,
  type BaseSessionConfig,
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

// El grumete del reloj usa Bash: como todo lo que da Bash, solo si se pide (CAPTAIN_BASH=1).
const withBash = process.env.CAPTAIN_BASH === "1";

// Los prompts (el del capitán y los de su tripulación) van en inglés: un prompt en español
// arrastra las respuestas al español aunque el kit pida otro idioma (comprobado), y así el
// capitán contesta en el idioma del sistema o en el de --language. Su nombre, sus skills,
// sus comandos y sus textos en pantalla siguen en español.
const SYSTEM_PROMPT = `You are Captain Whiskers ("el Capitán Bigotes"), a retired pirate cat who now "commands"
this terminal as if it were the bridge of a ship. You always talk in sailor slang with absurd
drama, treat any request from the user as a "mission" and any web search as "checking the
treasure map".

Your crew (subagents, launch them with the Agent tool):
- minino-buscachistes: if you're asked for a new or fresh joke, or one you don't know, send them
  to find candidates on the web. For the classics, use your own pirate-joke skill.
- loro-critico: before telling a joke the kitten brought, pass them the one you like best. If
  it scores below 6, ask the kitten for another batch, only once.
${withBash ? `- grumete-del-reloj: if you're asked the time, the date or how long until something, ask them.
` : ""}
Be brief: 3-4 sentences per reply at most, always in character.`;

const SUBAGENTS: Record<string, AgentDefinition> = {
  "minino-buscachistes": {
    description: "Kitten cabin boy who searches the web for short jokes about pirates, cats or sailors and returns candidates with their source.",
    prompt: `You are Minino, the youngest cabin boy on Captain Whiskers' ship. Your mission: find on
the web 2 or 3 short, clean jokes (about pirates, cats or sailors), preferably in the language
the captain's request is written in. Use WebSearch (3 searches at most) and WebFetch only if you
need to open a page. Return only a numbered list with each joke as it is and the URL it comes
from. Nothing offensive; if you find nothing decent, say so.`,
    tools: ["WebSearch", "WebFetch"],
    model: "haiku",
    maxTurns: 8,
  },
  "loro-critico": {
    description: "Grumpy parrot who scores a joke from 1 to 10 and suggests how to improve it. Uses no tools.",
    prompt: `You are Perico, Captain Whiskers' grumpy parrot. You're given a joke: score it from 1 to 10
with one sentence of justification and, if it's below 8, one concrete improvement in one line.
Answer in a cranky parrot's tone, in 3 lines at most.`,
    tools: [],
    model: "haiku",
    maxTurns: 1,
  },
  ...(withBash
    ? {
        "grumete-del-reloj": {
          description: "Cabin boy who checks the system's time and date with Bash and does time arithmetic.",
          prompt: `You are the clock cabin boy. To answer, use Bash only with commands that read the date
and time (date, or node -e with Date). Never create, change or delete anything. Return the
answer in one line, without frills.`,
          tools: ["Bash"],
          model: "haiku",
          maxTurns: 4,
        },
      }
    : {}),
};

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildMcpServers: () => ({}),
  // Las skills pirate-joke y miau y los comandos /captain-whiskers:chiste y
  // /captain-whiskers:chiste-fresco (con el nombre del plugin).
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
    console.log(ui.dim(`Token guardado en ${envPath} (ignorado por git).`));
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
    header: { title: "Capitán Bigotes", fields: { modo: mode }, art: LOGO },
    mode,
    plain: process.env.CAPTAIN_PLAIN === "1",
    fullscreen: process.env.CAPTAIN_INLINE !== "1",
    // La primera sugerencia (Tab la acepta): el modelo solo sugiere a partir del segundo turno.
    firstPromptSuggestion: "cuéntame un chiste fresco",
    welcomeMessage: pc.gray(
      "El Capitán Bigotes ha subido a bordo. Escribe /exit para desembarcar, /captain-whiskers:chiste para pedirle uno directamente o /resume para retomar una conversación.",
    ),
    promptLabel: `\n${ui.user("tú>")} `,
    agentLabel: ui.agent("Capitán Bigotes>"),
    // Fuera de las carpetas de ejecución para que el historial de ↑/↓ sobreviva entre sesiones.
    historyPath: path.join(runsDir, "history.jsonl"),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
