import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";
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
  // Sin acceso real a ficheros (no hay contextDir, ver main()): esto ya bastaba para que
  // includeFileTools los omitiera de `tools`/`allowedTools` en session.ts, pero
  // disallowedTools lo hace explícito e independiente de esa condición - el capitán sigue
  // teniendo WebFetch/WebSearch y su plugin (skills/comando) disponibles.
  disallowedTools: ["Read", "Write", "Glob"],
};

/** e.g. "2026-09-09T16-50-12-345Z" — filesystem-safe (no ":") and still sorts chronologically. */
function friendlyTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main(): Promise<void> {
  await createClaudeAuthTui("captain-whiskers").ensureClaudeAuth();

  const runsDir = path.join(__dirname, ".run");
  const runDir = path.join(runsDir, friendlyTimestamp());
  await mkdir(runDir, { recursive: true });

  // No `manualInterventionTexts` on `spec`: no live UI a human could step into by hand
  // (no browser, nothing), so request_manual_login is correctly never offered - see
  // agentSpec.ts. No `contextDir` either: this example doesn't use the context/knowledge
  // convention for anything — spec.pluginRoots() above is enough on its own to wire up
  // skills/plugins in buildSessionOptions() (session.ts).
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
    // A fixed path directly under .run/ (not runDir, which is per-run/timestamped) — so
    // ↑/↓ recalls prompts from earlier sessions too, not just the current one.
    historyPath: path.join(runsDir, "history.jsonl"),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
