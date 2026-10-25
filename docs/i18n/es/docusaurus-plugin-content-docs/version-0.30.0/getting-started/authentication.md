---
sidebar_position: 2
title: Autenticación
description: Cómo se autentica contra Claude un agente construido con el kit, y cómo conseguir un token de forma interactiva.
---

# Autenticación

El Claude Agent SDK ejecuta el CLI de Claude Code como subproceso, y ese subproceso lee sus credenciales del entorno. El kit nunca guarda un token por su cuenta: solo lo busca y, en un terminal, puede ayudar a la persona a conseguir uno.

## De dónde salen las credenciales {#where-credentials-come-from}

En este orden:

1. **`ANTHROPIC_API_KEY`**: una clave de API de Anthropic (el uso se factura a la cuenta de la API). Cuando está definida, no se comprueba nada más.
2. **`CLAUDE_CODE_OAUTH_TOKEN`**: un token de larga duración de una suscripción Claude Pro/Max, creado con `claude setup-token`.
3. **Un token que tu código pasa** (`claudeCodeOAuthToken`), que el kit copia en `CLAUDE_CODE_OAUTH_TOKEN` para el subproceso.

## `resolveClaudeAuth()`: buscarlo, sin interfaz {#resolveclaudeauth-look-it-up-headless}

```ts
import { resolveClaudeAuth } from "@falkenslab/agent-kit";

if (!resolveClaudeAuth({ claudeCodeOAuthToken: await myVault.get("claude") })) {
  throw new Error("No Claude credentials");
}
```

Es una búsqueda pura, sin E/S y sin salida por consola, segura en un servidor o en el proceso principal de Electron. Devuelve `true` cuando alguna de las tres fuentes tiene credenciales.

## `ensureClaudeAuth()`: buscarlo o conseguir uno en un terminal {#ensureclaudeauth-look-it-up-or-get-one-in-a-terminal}

```ts
import { ensureClaudeAuth } from "@falkenslab/agent-kit";

const newToken = await ensureClaudeAuth();
if (newToken) {
  // A token was just generated: save it wherever you keep secrets, for next time.
}
```

Cuando no encuentra credenciales:

1. explica que no se ha encontrado ningún token;
2. pregunta si se genera uno ahora con `claude setup-token` (ejecuta `npx @anthropic-ai/claude-code setup-token`, que abre un navegador para iniciar sesión);
3. define `CLAUDE_CODE_OAUTH_TOKEN` para este proceso y devuelve el token.

Termina el proceso si la persona se niega o pulsa Ctrl+C: sin token no hay agente que ejecutar. Devuelve `undefined` cuando ya había credenciales.

Los textos siguen el idioma del kit; pasa `{ language }` como segundo argumento para forzar uno:

```ts
await ensureClaudeAuth({}, { language: "es" });
```

## Guardar el token en un fichero `.env` {#keeping-the-token-in-a-env-file}

Node no lee ficheros `.env` por sí solo. Captain Whiskers carga el suyo al arrancar y guarda en él un token recién generado:

```ts title="agent.ts"
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureClaudeAuth } from "@falkenslab/agent-kit";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, ".env");

// What's already in the environment wins over the file; without a file nothing changes.
try {
  process.loadEnvFile(envPath);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const newToken = await ensureClaudeAuth();
if (newToken) {
  const previous = await readFile(envPath, "utf8").catch(() => "");
  const separator = previous && !previous.endsWith("\n") ? "\n" : "";
  await appendFile(envPath, `${separator}CLAUDE_CODE_OAUTH_TOKEN=${newToken}\n`);
}
```

:::warning Mantén los secretos fuera del control de versiones
Añade `.env` a tu `.gitignore`. El kit oculta `CLAUDE_CODE_OAUTH_TOKEN` en su propia [transcripción](../security/transcript.md), pero un `.env` subido por error es público para siempre.
:::

## Tu sesión de Claude Code no es la de tu agente {#your-claude-code-login-is-not-your-agents}

Si también usas Claude Code en la misma máquina, su sesión iniciada y su configuración viven en `~/.claude/`. El kit mantiene casi todo eso lejos de tu agente (consulta [Permisos y aislamiento](../security/permissions-and-isolation.md)), pero el CLI sigue añadiendo al contexto el nombre y el correo electrónico de la cuenta con la sesión iniciada. Eso puede influir en el idioma de las respuestas; consulta [Idiomas](../sessions/languages.md#limits).
