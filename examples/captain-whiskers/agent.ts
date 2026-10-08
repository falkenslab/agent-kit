import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { agentKitVersion, ensureClaudeAuth, getLanguage, messagesFor, runChatInk, runExtensionCommand, ui, type ToolDetail } from "@falkenslab/agent-kit";
import { CAPTAIN_DIR, createCaptain, texts } from "./captain.js";
import { startWebChat } from "./web/server.js";

// El capitán en la terminal, y en el navegador con --web. Lo que hace ser al capitán está en
// captain.ts; aquí, solo cómo se le ve.

// Node no carga .env por su cuenta. Se lee antes que nada (CAPTAIN_* incluidas); lo que ya
// esté en el entorno manda sobre el fichero, y sin .env todo sigue igual.
// CAPTAIN_ENV lo cambia (p. ej. para probar el inicio de sesión de su web con otro).
const envPath = process.env.CAPTAIN_ENV || path.join(CAPTAIN_DIR, ".env");
try {
  process.loadEnvFile(envPath);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

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
  // Todo lo que guarda vive en workspace/ (ignorado por git), su proyecto: así la carpeta del
  // capitán solo tiene su código. Lo suyo en todos sus proyectos (su memoria de ti, las
  // extensiones que se le instalan para todos) en ~/.captain-whiskers, o CAPTAIN_HOME.
  const captain = await createCaptain();
  const text = texts();

  // `npm start -- extension add ./extensions/jokebook` (list, remove, enable, disable): el
  // comando del kit, en su propio arranque, antes que nada.
  const args = process.argv.slice(2);
  if (await runExtensionCommand(args, { dirs: captain.extensionDirs, command: "npm start --" })) return;

  // En el navegador: su propia web, sobre el controlador de chat del kit. Sin token, la página
  // lo pide y lo guarda en el .env de su carpeta.
  if (args.includes("--web")) {
    const port = process.env.CAPTAIN_PORT ? Number(process.env.CAPTAIN_PORT) : undefined;
    const { url } = await startWebChat(captain, { envPath, ...(port ? { port } : {}), ...(process.env.CAPTAIN_WEB_TOKEN ? { token: process.env.CAPTAIN_WEB_TOKEN } : {}) });
    console.log(`${text.name}: ${url}`);
    return;
  }

  // Sin CLAUDE_CODE_OAUTH_TOKEN/ANTHROPIC_API_KEY (en el entorno o en .env) ofrece generar
  // un token. El kit no lo guarda: lo devuelve, y aquí se añade a .env para la próxima vez.
  const newToken = await ensureClaudeAuth();
  if (newToken) {
    const previous = await readFile(envPath, "utf8").catch(() => "");
    const separator = previous && !previous.endsWith("\n") ? "\n" : "";
    await appendFile(envPath, `${separator}CLAUDE_CODE_OAUTH_TOKEN=${newToken}\n`);
    console.log(ui.dim(text.tokenSaved(envPath)));
  }

  // Cuánto de las herramientas enseña el chat: CAPTAIN_TOOL_DETAIL=full (por defecto), calls
  // o summary.
  const details: ToolDetail[] = ["full", "calls", "summary"];
  const toolDetail = details.find((d) => d === process.env.CAPTAIN_TOOL_DETAIL) ?? "full";

  // Interfaz Ink a pantalla completa (CAPTAIN_INLINE=1: en línea, con el historial de la
  // terminal); sin TTY, o con CAPTAIN_PLAIN=1, el chat de readline. Recibe cómo abrir la
  // sesión de una carpeta de ejecución, porque /resume la vuelve a abrir en otra. Shift+Tab
  // recorre guided, interactive y plan (una sesión autónoma no puede cambiar).
  await runChatInk(captain.opener, {
    runsDir: captain.runsDir,
    // El nombre del modo, en el idioma del kit (el mismo que en la barra de estado), y la
    // versión de agent-kit con la que navega.
    header: { title: text.name, fields: { [text.mode]: messagesFor(getLanguage()).mode(captain.mode), "agent-kit": agentKitVersion() }, art: LOGO },
    mode: captain.mode,
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
    historyPath: captain.historyPath,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
