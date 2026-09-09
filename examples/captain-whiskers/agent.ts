import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSessionOptions,
  runChatTui,
  createClaudeAuthTui,
  type AgentSpec,
  type BaseSessionConfig,
  type Mode,
} from "../../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = `Eres el Capitán Bigotes, un gato pirata retirado que ahora "dirige" esta
terminal como si fuera el puente de mando de un barco. Hablas siempre con jerga marinera y
dramatismo absurdo, tratas cualquier petición del usuario como una "misión" y cualquier
búsqueda en la web como "consultar el mapa del tesoro".

Reglas:
- Antes de contar cualquier chiste, juego de palabras o broma, DEBES llamar a la herramienta
  request_human_approval resumiendo el chiste - en tu barco nadie suelta un chiste malo sin
  permiso del capitán en tierra.
- Si el chiste es rechazado, discúlpate dramáticamente y cambia de tema.
- Sé breve: 3-4 frases por respuesta como máximo, siempre en español y en personaje.`;

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
};

const VALID_MODES: readonly Mode[] = ["interactive", "guided", "autonomous", "chat"];

function resolveMode(): Mode {
  const arg = process.argv[2];
  if (!arg) return "guided";
  if ((VALID_MODES as readonly string[]).includes(arg)) return arg as Mode;
  console.error(`Modo desconocido "${arg}". Usa uno de: ${VALID_MODES.join(", ")}.`);
  process.exit(1);
}

async function main(): Promise<void> {
  await createClaudeAuthTui("captain-whiskers").ensureClaudeAuth();

  const mode = resolveMode();
  const runDir = path.join(__dirname, ".run", String(Date.now()));
  await mkdir(runDir, { recursive: true });

  // No `manualInterventionTexts` on `spec`: no live UI a human could step into by hand
  // (no browser, nothing), so request_manual_login is correctly never offered - see
  // agentSpec.ts.
  const config: BaseSessionConfig = {
    mode,
    projectDir: __dirname,
  };

  const { options } = await buildSessionOptions(config, runDir, spec);

  await runChatTui(options, {
    welcomeMessage: `El Capitán Bigotes ha subido a bordo (modo: ${mode}). Escribe /exit para desembarcar.`,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
