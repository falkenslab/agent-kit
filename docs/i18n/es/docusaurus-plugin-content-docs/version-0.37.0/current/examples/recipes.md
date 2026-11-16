---
sidebar_position: 2
title: Recetas
description: Soluciones cortas y completas para necesidades habituales al construir un agente con el kit.
---

# Recetas

## Un asistente de configuración y, después, el chat {#a-setup-wizard-then-the-chat}

Pregunta una vez por el workspace y el modo, recuérdalos y después arranca el chat.

```ts
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSessionOptions, ensureClaudeAuth, isExitPromptError, runChatInk, runWizard, type Mode } from "@falkenslab/agent-kit";

const settingsFile = path.resolve(".agent-settings.json");
const saved = JSON.parse(await readFile(settingsFile, "utf8").catch(() => "{}")) as { workspace?: string; mode?: Mode };

let answers;
try {
  answers = await runWizard(
    [
      { type: "input", name: "workspace", message: "Workspace folder", default: saved.workspace ?? process.cwd() },
      {
        type: "select",
        name: "mode",
        message: "Supervision",
        choices: [
          { name: "Guided", value: "guided" },
          { name: "Step by step", value: "interactive" },
          { name: "Autonomous", value: "autonomous" },
        ],
        default: saved.mode ?? "guided",
      },
    ],
    { title: "My agent" },
  );
} catch (error) {
  if (isExitPromptError(error)) process.exit(0);
  throw error;
}
await writeFile(settingsFile, JSON.stringify(answers, null, 2));

await ensureClaudeAuth();
const workspace = path.resolve(String(answers.workspace));
const config = { mode: answers.mode as Mode, projectDir: workspace }; // the spec's extensions put their folders in it

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.join(workspace, ".run"),
  fullscreen: true,
  mode: config.mode,
});
```

## Un agente de navegador con inicio de sesión manual {#a-browser-agent-with-manual-login}

El servidor MCP de Playwright maneja un navegador; la persona inicia sesión a mano cuando el agente no puede; las descargas van a la carpeta de la ejecución y se guardan con `save_to_sources`.

```ts
const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => loadPrompt("system.md", { site: config.siteUrl }),
  buildMcpServers: (config, runDir) => ({
    playwright: { command: "npx", args: ["@playwright/mcp@latest", "--output-dir", runDir] },
  }),
  pluginRoots: () => [path.join(here, "plugin")],
  buildSubagents: () => undefined,
  disallowedTools: ["mcp__playwright__browser_run_code_unsafe"],
  manualInterventionTexts: {
    toolDescription: "Call this when you can't log in by yourself. A person logs in by hand in the browser window.",
    confirmedMessage: "The person is done. Check you're logged in, then continue.",
    checkpointTitle: "Log in by hand",
    checkpointLines: ["Log in in the browser window the agent opened, then confirm here."],
  },
  extensions: [
    sources({
      dir: (config) => path.join(config.projectDir, "sources"),
      saveDescription: "Keep a document you downloaded from the site (it lands in this run's folder) in sources/, to study it in later sessions.",
    }),
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }),
  ],
};

const config: Config = {
  mode: "guided",
  projectDir: workspace,
  siteUrl: "https://intranet.example.com",
};

const formatAction = createFriendlyToolLabel({
  describe: (tool, input) =>
    tool === "browser_navigate" ? `Opening ${truncate(String(input.url), 70)}` : tool === "browser_click" ? `Clicking "${truncate(String(input.element), 50)}"` : undefined,
  extraLocalServers: ["playwright"],
});
```

## Una herramienta peligrosa que siempre pregunta {#a-dangerous-tool-that-always-asks}

```ts
tool("delete_page", "Delete a page of the site.", { pageId: z.string() }, async ({ pageId }) => {
  const answer = await askForDecision(runDir, { title: "Delete a page", lines: [`Page: ${pageId}`] });
  if (!["", "y", "yes"].includes(answer)) return { content: [{ type: "text" as const, text: "Not approved." }], isError: true };
  await site.deletePage(pageId);
  return { content: [{ type: "text" as const, text: `Deleted ${pageId}.` }] };
});
```

En todos los modos, la persona confirma antes de que se borre la página. Construye el servidor dentro de `buildMcpServers(config, runDir)` para que tenga la carpeta de la ejecución.

## Un chat para un público no técnico {#a-chat-for-a-non-technical-audience}

La salida de las herramientas está escrita para el modelo; a un docente o a un cliente solo le hace falta saber qué está haciendo el agente. Muestra las llamadas sin sus resultados, oculta las líneas en bruto de las herramientas que aún muestran una al desplegarse y mantén las etiquetas amigables:

```ts
await runChatInk(opener, {
  runsDir,
  toolDetail: "calls", // "● Searching the web for …", no "Web search results for query: …" under it
  formatResult: (tool) => (tool.startsWith("mcp__playwright__") ? null : undefined),
  formatAction: createFriendlyToolLabel({ describe: (tool) => (tool === "mcp__playwright__browser_navigate" ? "Opening the page" : undefined) }),
});
```

Ctrl+O sigue desplegándolo todo para quien necesite verlo, y `session.log` conserva el detalle completo.

## Un prompt distinto para cada modo {#a-different-prompt-per-mode}

```ts
buildSystemPrompt: (config) =>
  [loadPrompt("role.md"), loadPrompt(config.mode === "autonomous" ? "autonomous.md" : "supervised.md")].join("\n\n"),
```

## Probar un agente {#testing-an-agent}

Responde a los puntos de control solo a través del fichero de respuesta, con un idioma fijo, y comprueba los eventos:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildSessionOptions, runQuery, setInteractionPort, setLanguage } from "@falkenslab/agent-kit";

test("the agent asks before publishing", async () => {
  setLanguage("en");
  setInteractionPort(null); // checkpoints wait for the response file
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-"));
  const { options } = await buildSessionOptions({ mode: "guided", projectDir: runDir }, runDir, spec);

  const run = runQuery("Publish the weekly summary", options);
  const tools: string[] = [];
  for await (const event of run.events) {
    if (event.type === "action") {
      tools.push(event.toolName);
      if (event.toolName === "mcp__approvals__request_human_approval") {
        await writeFile(path.join(runDir, "approval-response.txt"), "n\n");
      }
    }
  }
  assert.ok(tools.includes("mcp__approvals__request_human_approval"));
});
```

Estas pruebas llaman al modelo real: que sean pocas y ejecútalas aparte de tus pruebas unitarias.

## Mantener un secreto fuera de alcance {#keeping-a-secret-out-of-reach}

```ts
const configFile = path.join(workspace, "agent.config.json");
const { password } = JSON.parse(await readFile(configFile, "utf8"));

const config: Config = {
  mode: "guided",
  projectDir: workspace,
  extraReadableDirs: [workspace],
  deniedPaths: [configFile, path.join(workspace, ".env")],
  secrets: [password],
  password,
};
```

El agente no puede leer el fichero ni buscar en él, y el valor se oculta en `transcript.jsonl` si alguna vez aparece en una llamada a herramienta.
