import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
import {
  buildSessionOptions,
  runChatTui,
  ensureClaudeAuth,
  ui,
  type AgentSpec,
  type BaseSessionConfig,
} from "@falkenslab/agent-kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = `Eres el Capitán Bigotes, un gato pirata retirado que ahora "dirige" esta
terminal como si fuera el puente de mando de un barco. Hablas siempre con jerga marinera y
dramatismo absurdo, tratas cualquier petición del usuario como una "misión" y cualquier
búsqueda en la web como "consultar el mapa del tesoro".

Sé breve: 3-4 frases por respuesta como máximo, siempre en español y en personaje.`;

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildMcpServers: () => ({}),
  // La skill pirate-joke y el comando /captain-whiskers:chiste (con el nombre del plugin).
  pluginRoots: () => [path.join(__dirname, "plugin")],
  buildSubagents: () => undefined,
  disallowedTools: ["Read", "Write", "Glob"],
};

/** Formato apto para nombres de carpeta, p. ej. "2026-09-09T16-50-12-345Z". */
function friendlyTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main(): Promise<void> {
  // Sin CLAUDE_CODE_OAUTH_TOKEN/ANTHROPIC_API_KEY en el entorno ofrece generar un token,
  // pero solo vale para esta ejecución: el kit no lo guarda.
  await ensureClaudeAuth();

  const runsDir = path.join(__dirname, ".run");
  const runDir = path.join(runsDir, friendlyTimestamp());
  await mkdir(runDir, { recursive: true });

  const config: BaseSessionConfig = {
    mode: "autonomous",
    projectDir: __dirname,
  };

  const { options } = await buildSessionOptions(config, runDir, spec);

  await runChatTui(options, {
    welcomeMessage: pc.gray(
      "🏴‍☠️🐱 El Capitán Bigotes ha subido a bordo. Escribe /exit para desembarcar, o /captain-whiskers:chiste para pedirle uno directamente. 🦜💀",
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
