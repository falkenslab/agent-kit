---
sidebar_position: 2
title: Autenticación
description: Cómo llega a Claude un agente construido con el kit - una sesión con la cuenta de Claude de la persona, por el propio flujo de Anthropic, o una API key.
---

# Autenticación

El Claude Agent SDK ejecuta Claude Code como subproceso, y Claude Code encuentra sus propias credenciales: una API key en el entorno, o la cuenta de Claude con la que se ha iniciado sesión en él. El kit nunca ve, devuelve ni guarda el token de una cuenta de Claude. Solo pregunta si la persona ha iniciado sesión y, si no, ejecuta el propio inicio de sesión de Claude Code.

## Por qué: las condiciones de Anthropic {#why-anthropics-terms}

Las [condiciones legales y de cumplimiento](https://code.claude.com/docs/en/legal-and-compliance) de Anthropic («Authentication and credential use») dicen que quien desarrolla sobre el Agent SDK no puede recoger, guardar ni hacer de intermediario de credenciales o tokens de sesión de Claude.ai: el inicio de sesión en una cuenta de Claude tiene que completarse por el propio flujo de Anthropic. Una persona puede iniciar sesión en el binario de Claude Code sin modificar con su propia suscripción de Claude, y las API keys están permitidas.

Por eso el kit ejecuta el binario de Claude Code que trae el Agent SDK (`@anthropic-ai/claude-agent-sdk-<plataforma>-<arquitectura>`, sin modificar; nadie necesita tener Claude Code instalado) y deja que sea él quien inicie la sesión: `claude auth login` abre la página de Anthropic en el navegador, y el binario guarda él mismo las credenciales (en `~/.claude/`, o en el Llavero en macOS), donde las encuentra cada sesión de tu agente. Nada en el kit lee ese archivo.

## De dónde salen las credenciales {#where-credentials-come-from}

1. **`ANTHROPIC_API_KEY`**: una API key de Anthropic (el uso se factura a la cuenta de la API), definida por la persona o por tu host.
2. **`CLAUDE_CODE_OAUTH_TOKEN`**, cuando la persona la define en su propio entorno: es ajuste suyo, y el kit no la pide, ni la crea, ni la guarda.
3. **La cuenta de Claude con la sesión iniciada en Claude Code**: lo que dice `claude auth status`.

## `claudeSignedIn()`: preguntar, sin terminal {#claudesignedin-ask-headless}

```ts
import { claudeSignedIn } from "@falkenslab/agent-kit";

if (!(await claudeSignedIn())) {
  // Ofrece iniciar sesión (startClaudeSignIn()) o una API key.
}
```

Verdadero cuando el entorno tiene `ANTHROPIC_API_KEY` o `CLAUDE_CODE_OAUTH_TOKEN`; si no, ejecuta `claude auth status --json` y devuelve su `loggedIn`. No escribe nada en la consola: sirve en un servidor o en el proceso principal de Electron.

## `ensureClaudeAuth()`: iniciar sesión desde un terminal {#ensureclaudeauth-sign-in-from-a-terminal}

```ts
import { ensureClaudeAuth } from "@falkenslab/agent-kit";

await ensureClaudeAuth();
```

Cuando la persona no ha iniciado sesión:

1. se lo dice, y que puede iniciarla con su cuenta de Claude en la página de Anthropic o definir `ANTHROPIC_API_KEY`;
2. pregunta si iniciarla ahora;
3. ejecuta `claude auth login` en el terminal: el navegador se abre en la página de Anthropic y, si la página muestra un código, la persona lo pega en el terminal;
4. vuelve a comprobar `claudeSignedIn()`.

No devuelve nada, y no hay nada que guardar: Claude Code guarda la sesión, así que el siguiente arranque entra directamente. Termina el proceso si la persona dice que no, pulsa Ctrl+C o el inicio de sesión no se completa.

Los textos siguen el idioma del kit; pasa `{ language }` para forzar uno:

```ts
await ensureClaudeAuth({ language: "es" });
```

## `startClaudeSignIn()`: iniciar sesión desde una ventana o una página web {#startclaudesignin-sign-in-from-a-window-or-a-web-page}

Un host sin terminal ejecuta el mismo inicio de sesión con tuberías normales, y muestra en su propia pantalla lo que la persona necesita:

```ts
import { startClaudeSignIn } from "@falkenslab/agent-kit";

const signIn = startClaudeSignIn(); // { console: true } para una cuenta de Anthropic Console
const url = await signIn.url;       // la página de Anthropic: muéstrala como enlace, por si el navegador no se abrió
// Cuando la persona pega el código que muestra esa página:
signIn.sendCode(code);
if (await signIn.done) openTheChat(); // done: el binario terminó, y la persona tiene la sesión iniciada
// signIn.cancel() lo detiene.
```

El binario abre el navegador él mismo. `url` es `undefined` si terminó sin escribir una, y `done` se resuelve con `claudeSignedIn()` cuando ha terminado. La página web del Capitán Bigotes hace exactamente esto: consulta [Captain Whiskers](../examples/captain-whiskers.md).

## Una API key {#an-api-key}

Una API key está permitida: define `ANTHROPIC_API_KEY` antes de que empiece la sesión. Un agente puede pedírsela a la persona (un campo de ajustes) y guardarla, como guarda el Capitán Bigotes la que se pega en su página. Node no lee archivos `.env` por sí solo: carga uno con `process.loadEnvFile()`.

:::warning Mantén los secretos fuera del control de versiones
Añade `.env` a tu `.gitignore`. El kit oculta `CLAUDE_CODE_OAUTH_TOKEN` en su propia [transcripción](../security/transcript.md) cuando el entorno tiene uno, pero un `.env` subido por error es público para siempre.
:::

## Tu sesión de Claude Code es la de tu agente {#your-claude-code-sign-in-is-your-agents}

La sesión vive en `~/.claude/`, el mismo sitio donde la guarda Claude Code: si también usas Claude Code en la misma máquina, tu agente usa la cuenta con la que has iniciado sesión allí, e iniciarla desde cualquiera de los dos sirve para ambos. El kit mantiene el resto de esa carpeta (ajustes, skills, `CLAUDE.md`) lejos de tu agente (consulta [Permisos y aislamiento](../security/permissions-and-isolation.md)), pero el CLI sigue añadiendo al contexto el nombre y el correo electrónico de la cuenta con la sesión iniciada. Eso puede influir en el idioma de las respuestas; consulta [Idiomas](../sessions/languages.md#limits).
