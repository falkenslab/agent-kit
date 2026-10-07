// The Electron probe of ADR-026 (#41): does an agent-kit agent run inside an Electron app,
// packaged and not? A window, a chat controller, one turn with a tool, everything logged.
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow } from "electron";

const logDir = process.env.PROBE_LOG_DIR || app.getPath("userData");
mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, "probe.log");
const log = (line) => appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);

// The token, from a .env given by path (a real app would sign in from its window).
if (process.env.PROBE_ENV) process.loadEnvFile(process.env.PROBE_ENV);

async function probe(window) {
  const show = (text) => window.webContents.executeJavaScript(`document.body.innerText += ${JSON.stringify(`${text}\n`)}`);
  log(`packaged=${app.isPackaged} execPath=${process.execPath} electron=${process.versions.electron} node=${process.versions.node}`);
  const { buildSessionOptions, createChatController, agentKitVersion } = await import("@falkenslab/agent-kit");
  log(`agent-kit ${agentKitVersion()} loaded`);

  const workspace = path.join(logDir, "workspace");
  mkdirSync(workspace, { recursive: true });
  const spec = {
    buildSystemPrompt: () => "You are a probe. Answer in one short line.",
    identity: { name: "Probe", version: "0.0.1", description: "an Electron probe of agent-kit" },
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
    // A kit extension whose plugin the CLI must read from the installed app.
    extensions: ["knowledge"],
    skills: "plugins",
    settingSources: [],
  };
  const config = { mode: "guided", projectDir: workspace, knowledgeDir: path.join(workspace, "knowledge") };
  const runsDir = path.join(logDir, "runs");
  try {
    log(`sdk binary resolves to ${import.meta.resolve("@anthropic-ai/claude-agent-sdk-win32-x64/package.json")}`);
  } catch (error) {
    log(`sdk binary doesn't resolve: ${error.message}`);
  }
  const opener = async (run) => {
    const built = await buildSessionOptions(config, run.dir, spec, { run });
    const executable = process.env.PROBE_CLAUDE_PATH;
    return { ...built, options: { ...built.options, ...(executable ? { pathToClaudeCodeExecutable: executable } : {}), stderr: (data) => log(`stderr ${data.trim()}`) } };
  };
  setTimeout(() => {
    log("PROBE TIMEOUT: no turn-end after 90 s");
    app.quit();
  }, 90_000);
  const chat = await createChatController(opener, { runsDir, panels: "state", promptSuggestions: false });
  chat.onEvent((event) => {
    if (event.type === "agent" && event.event.type === "action") log(`action ${event.event.toolName}`);
    if (event.type === "agent" && event.event.type === "turn-end") log(`turn-end failed=${event.event.failed} ${event.event.errorText ?? ""}`);
    if (event.type === "agent" && event.event.type === "mcp-error") log(`mcp-error ${event.event.failedServers.join(",")}`);
  });
  await show("Asking the agent…");
  await chat.send(process.env.PROBE_PROMPT || "What date and time is it? Use your current_time tool, then answer in one line. Then call knowledge_index once.");
  const reply = chat.lastReply();
  log(`reply: ${reply}`);
  const tools = chat.getState().transcript.flatMap((entry) => (entry.kind === "tools" ? entry.calls.map((call) => `${call.toolName}:${call.result?.isError ? "error" : "ok"}`) : []));
  log(`tools: ${tools.join(" ")}`);
  await show(`Reply: ${reply}\nTools: ${tools.join(" ")}`);
  chat.close();
  log("PROBE OK");
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 700, height: 400, show: !process.env.PROBE_HIDDEN });
  await window.loadURL("data:text/html,<body style='font:14px sans-serif;white-space:pre-wrap'></body>");
  try {
    await probe(window);
  } catch (error) {
    log(`PROBE FAILED: ${error?.stack ?? error}`);
  }
  if (process.env.PROBE_AUTOQUIT) app.quit();
});
