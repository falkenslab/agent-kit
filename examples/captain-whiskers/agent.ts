import { appendFile, mkdir, readFile } from "node:fs/promises";
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

const SYSTEM_PROMPT = `Eres el Capitán Bigotes, un gato pirata retirado que ahora "dirige" esta
terminal como si fuera el puente de mando de un barco. Hablas siempre con jerga marinera y
dramatismo absurdo, tratas cualquier petición del usuario como una "misión" y cualquier
búsqueda en la web como "consultar el mapa del tesoro".

Tu tripulación (subagentes, lánzalos con la herramienta Agent):
- minino-buscachistes: si te piden un chiste nuevo, fresco o que no conozcas, mándalo a buscar
  candidatos a la web. Para los chistes de siempre usa tu propia skill pirate-joke.
- loro-critico: antes de contar un chiste que haya traído el minino, pásale el que más te guste.
  Si le pone menos de un 6, pide al minino otra tanda, solo una vez.
${withBash ? `- grumete-del-reloj: si preguntan la hora, la fecha o cuánto falta para algo, pregúntale a él.
` : ""}
Sé breve: 3-4 frases por respuesta como máximo, siempre en español y en personaje.`;

const SUBAGENTS: Record<string, AgentDefinition> = {
  "minino-buscachistes": {
    description: "Grumete gatuno que busca en la web chistes cortos de piratas, gatos o marineros y devuelve candidatos con su fuente.",
    prompt: `Eres Minino, el grumete más joven del barco del Capitán Bigotes. Tu misión: encontrar
en la web 2 o 3 chistes cortos y blancos (de piratas, gatos o marineros), preferiblemente en
español. Usa WebSearch (como mucho 3 búsquedas) y WebFetch solo si hace falta abrir una página.
Devuelve únicamente una lista numerada con cada chiste tal cual y la URL de donde sale.
Nada ofensivo; si no encuentras nada decente, dilo.`,
    tools: ["WebSearch", "WebFetch"],
    model: "haiku",
    maxTurns: 8,
  },
  "loro-critico": {
    description: "Loro gruñón que puntúa del 1 al 10 un chiste y propone cómo mejorarlo. No usa herramientas.",
    prompt: `Eres Perico, el loro gruñón del Capitán Bigotes. Te pasan un chiste: ponle una nota del
1 al 10 con una frase de justificación y, si baja de 8, una mejora concreta en una línea.
Responde en español, con tono de loro cascarrabias, en 3 líneas como máximo.`,
    tools: [],
    model: "haiku",
    maxTurns: 1,
  },
  ...(withBash
    ? {
        "grumete-del-reloj": {
          description: "Grumete que consulta la hora y la fecha del sistema con Bash y hace cuentas de tiempo.",
          prompt: `Eres el grumete del reloj. Para responder usa Bash solo con comandos de lectura
de fecha y hora (date, o node -e con Date). Nunca crees, cambies ni borres nada. Devuelve la
respuesta en una línea, sin adornos.`,
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
};

/** Formato apto para nombres de carpeta, p. ej. "2026-09-09T16-50-12-345Z". */
function friendlyTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

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

  const runsDir = path.join(__dirname, ".run");
  const runDir = path.join(runsDir, friendlyTimestamp());
  await mkdir(runDir, { recursive: true });

  // Autónomo por defecto; CAPTAIN_MODE=interactive pide permiso antes de cada herramienta
  // (útil para ver los paneles de aprobación) y CAPTAIN_MODE=guided solo antes de publicar.
  const modes: Mode[] = ["autonomous", "guided", "interactive"];
  const mode = modes.find((m) => m === process.env.CAPTAIN_MODE) ?? "autonomous";

  const config: BaseSessionConfig = {
    mode,
    projectDir: __dirname,
  };

  const { options } = await buildSessionOptions(config, runDir, spec);

  // Interfaz Ink a pantalla completa (CAPTAIN_INLINE=1: en línea, con el historial de la
  // terminal); sin TTY, o con CAPTAIN_PLAIN=1, el chat de readline.
  await runChatInk(options, {
    header: { title: "Capitán Bigotes", fields: { modo: mode, sesión: path.basename(runDir) } },
    mode,
    plain: process.env.CAPTAIN_PLAIN === "1",
    fullscreen: process.env.CAPTAIN_INLINE !== "1",
    welcomeMessage: pc.gray(
      "El Capitán Bigotes ha subido a bordo. Escribe /exit para desembarcar, o /captain-whiskers:chiste para pedirle uno directamente.",
    ),
    promptLabel: `\n${ui.user("tú>")} `,
    agentLabel: ui.agent("Capitán Bigotes>"),
    sessionLogPath: path.join(runDir, "session.log"),
    // Fuera de runDir para que el historial de ↑/↓ sobreviva entre sesiones.
    historyPath: path.join(runsDir, "history.jsonl"),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
