import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSessionOptions,
  runChatTui,
  createClaudeAuthTui,
  ui,
  type AgentSpec,
  type BaseSessionConfig,
} from "../../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Siempre "autonomous" (ver main()), sin argumento de línea de comandos para elegir otro
// modo: buildSessionOptions() (session.ts) omite la tool request_human_approval
// precisamente en ese modo (includeApprovalTool = mode !== "autonomous"), así que no hay
// ninguna regla de aprobación que mandarle al modelo - el capitán suelta el chiste
// directamente, sin ningún canal para pedir permiso.
const SYSTEM_PROMPT = `Eres el Capitán Bigotes, un gato pirata retirado que ahora "dirige" esta
terminal como si fuera el puente de mando de un barco. Hablas siempre con jerga marinera y
dramatismo absurdo, tratas cualquier petición del usuario como una "misión" y cualquier
búsqueda en la web como "consultar el mapa del tesoro".

Sé breve: 3-4 frases por respuesta como máximo, siempre en español y en personaje.`;

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildMcpServers: () => ({}),
  // Plugin local con manifiesto (.claude-plugin/plugin.json, name: "captain-whiskers")
  // demostrando una skill (pirate-joke, enseña al modelo a construir el chiste) y un
  // comando de barra propio: se invoca como /captain-whiskers:chiste (namespaced con el
  // nombre del plugin - un /chiste a secas no se reconoce, confirmado empíricamente: se
  // comporta como si no se hubiera escrito nada, igual que en moodle-agent's
  // /moodle-agent:map). Ver plugin/skills/pirate-joke/SKILL.md y plugin/commands/chiste.md.
  pluginRoots: () => [path.join(__dirname, "plugin")],
  buildSubagents: () => undefined,
};

/** e.g. "2026-09-09T16-50-12-345Z" — filesystem-safe (no ":") and still sorts chronologically. */
function friendlyTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main(): Promise<void> {
  await createClaudeAuthTui("captain-whiskers").ensureClaudeAuth();

  const runDir = path.join(__dirname, ".run", friendlyTimestamp());
  await mkdir(runDir, { recursive: true });

  // No `manualInterventionTexts` on `spec`: no live UI a human could step into by hand
  // (no browser, nothing), so request_manual_login is correctly never offered - see
  // agentSpec.ts.
  //
  // `contextDir` is set purely to flip on `includeFileTools` in buildSessionOptions()
  // (session.ts) — that's what wires up `cwd`/`skills: "all"`/`plugins`, so it's the only
  // way to make spec.pluginRoots() above actually take effect; this example doesn't use
  // the context/knowledge convention for anything else (see context/README.md).
  const config: BaseSessionConfig = {
    mode: "autonomous",
    projectDir: __dirname,
    contextDir: path.join(__dirname, "context"),
  };

  const { options } = await buildSessionOptions(config, runDir, spec);

  await runChatTui(options, {
    welcomeMessage: "El Capitán Bigotes ha subido a bordo. Escribe /exit para desembarcar, o /captain-whiskers:chiste para pedirle uno directamente.",
    promptLabel: `\n${ui.user("tú>")} `,
    agentLabel: ui.agent("Capitán Bigotes>"),
    sessionLogPath: path.join(runDir, "session.log"),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
