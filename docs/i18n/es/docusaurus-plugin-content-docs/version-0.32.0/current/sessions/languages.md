---
sidebar_position: 2
title: Idiomas
description: Los cuatro idiomas del kit, cómo se elige el idioma, el idioma de las respuestas, los textos propios de un agente en varios idiomas y los límites.
---

# Idiomas

Los textos propios del kit (barra de estado, spinner, paneles, atajos, etiquetas de herramientas, resúmenes de turno, prompts de autenticación) están en **inglés, español, francés y alemán**, y al agente se le pide que responda en ese mismo idioma.

## Cómo se elige el idioma {#how-the-language-is-chosen}

Una vez por proceso, en este orden:

1. **`--language=<code>`** en la línea de comandos (o `--language <code>`);
2. **la opción del agente**: `config.language`, o la opción `language` de un punto de entrada de la interfaz;
3. **el idioma del sistema**: la configuración regional de `Intl`, y después `LC_ALL`, `LC_MESSAGES`, `LANG`;
4. **inglés**.

Los códigos son `en`, `es`, `fr`, `de`; las variantes regionales funcionan (`es-ES`, `fr_FR.UTF-8`). Un código no admitido muestra un aviso de una línea y pasa a la siguiente fuente.

```bash
npx tsx agent.ts --language=fr
npm start -- --language=de     # with npm, arguments go after --
```

```ts
const config: BaseSessionConfig = { mode: "guided", projectDir, language: "es" };
```

`buildSessionOptions()` elige el idioma (y añade la línea del idioma de respuesta); un chat, una vista de progreso o un asistente que se arranque después sin su propio `language` lo conserva. `getLanguage()` lo devuelve, `setLanguage(code)` lo fija directamente (un host de escritorio con su propia opción de idioma), y `resolveLanguage()` / `detectLanguage()` lo resuelven sin fijar nada.

## Cambiarlo sobre la marcha {#switching-on-the-fly}

Sigue habiendo un idioma por proceso, pero un host puede cambiarlo mientras el chat se ejecuta: `switchLanguage(code)` lo fija y, a partir de entonces, lo mantiene por encima de `--language` y `config.language` (`setLanguage()` por sí solo perdería frente a ellos la próxima vez que se construyan las opciones). El `setLanguage(code)` del [controlador del chat](../advanced/custom-hosts.md#the-chat-controller) lo hace por ti: cambia el idioma, vuelve a abrir la sesión en el nuevo idioma conservando la conversación y se lo dice al modelo con el siguiente mensaje de la persona.

Los textos propios del agente solo lo siguen si se eligen al abrirse la sesión, no una vez al arrancar: construye la spec (prompt, nombres, subagentes) en el abridor de sesión, a partir de `getLanguage()`. Captain Whiskers lo hace así, y guarda la elección de la persona en su carpeta personal:

```ts
const chat = await createChatController(async (run) => buildSessionOptions(config, run.dir, makeSpec(), { run }), { runsDir, panels: "state" });
await chat.setLanguage("fr", { note: "Your name is now Capitaine Moustaches." });
```

Aun así, la conversación anterior tira: las respuestas cambian enseguida, pero el modelo conserva un nombre que ya usó en otro idioma salvo que se le diga. El aviso le pide que use los nombres que le dan ahora sus instrucciones, y `note` dice cuáles: sin ella, el capitán respondió en francés como "Capitaine Whiskers"; con ella, como "Capitaine Moustaches".

## El idioma de las respuestas {#the-reply-language}

`buildSessionOptions()` añade una línea al prompt del sistema y al prompt de cada subagente:

> Language: use French both to reply and for everything you keep (knowledge base pages, preferences, notes, the log), whatever language these instructions, your skills, your sources or the human's name are in. Switch both to another language only when the human's message is clearly written in it; a greeting, a slash command or a single word doesn't count.

Así, el agente responde, y escribe su base de conocimiento, en el idioma elegido, y sigue a la persona cuando esta escribe claramente en otro. Desactívalo con `replyInLanguage: false` en la spec cuando tu prompt decida el idioma por sí mismo.

Una línea en el prompt de sistema queda lejos de donde escribe el modelo, y tras leer algo en inglés (una fuente, una skill, el resultado de una herramienta) su narración entre llamadas podía pasarse al inglés. Por eso, cuando el idioma no es inglés, el kit lo repite en una línea ("Reply language: Spanish, your narration between tool calls too.", unos quince tokens) tras cada llamada a herramienta del agente principal y con cada mensaje de la persona. `replyInLanguage: "prompt-only"` deja solo la línea del prompt.

## Límites {#limits}

La línea es una pista fuerte, no una garantía. Comprobado a mano:

- **El nombre de la persona arrastra lo que escribe el agente hacia su idioma**: la CLI siempre pone el nombre de la cuenta en el contexto, y una herramienta que pedía algo "en el idioma de la persona" obtuvo páginas en español desde un chat en inglés con un nombre español. Las herramientas del kit dicen "en el idioma en el que respondes"; di lo mismo en las tuyas.
- **El texto en otro idioma arrastra las respuestas hacia él**: el prompt del agente, sus skills, sus comandos, los nombres de sus subagentes. Escribe en inglés (o en el idioma que quieras) todo lo que lee el modelo si el agente debe seguir el idioma elegido.
- **La identidad de quien lo ejecuta**: la CLI pone en el contexto el nombre y el correo electrónico de la cuenta de Claude Code con la sesión iniciada, y el modelo puede deducir de ellos el idioma de quien lo ejecuta, sobre todo en preguntas sobre el propio agente. El kit ya quita el contexto de git (el nombre de usuario de git de quien lo ejecuta) por este motivo; la cuenta no se puede quitar.
- **Los mensajes en inglés** no siempre cambian el idioma: el modelo tiende a tomar el inglés como neutro.

## Los textos propios de un agente {#an-agents-own-texts}

Los textos que el agente pasa al kit (cabecera, mensaje de bienvenida, etiqueta del prompt, textos de aprobación, etiquetas de sus propias herramientas) son suyos: el kit no los traduce. Para que también sigan el idioma, elígelos con `detectLanguage()`, como hace Captain Whiskers:

```ts
import { detectLanguage, messagesFor, type Language } from "@falkenslab/agent-kit";

const { language } = detectLanguage(); // --language, else the system's

const TEXTS: Record<Language, { name: string; you: string; welcome: string }> = {
  en: { name: "Captain Whiskers", you: "you>", welcome: "Captain Whiskers is aboard." },
  es: { name: "Capitán Bigotes", you: "tú>", welcome: "El Capitán Bigotes ha subido a bordo." },
  fr: { name: "Capitaine Moustaches", you: "toi>", welcome: "Le Capitaine Moustaches est à bord." },
  de: { name: "Käpt'n Schnurrbart", you: "du>", welcome: "Käpt'n Schnurrbart ist an Bord." },
};
const text = TEXTS[language];

await runChatInk(opener, {
  runsDir,
  header: { title: text.name, fields: { mode: messagesFor(language).mode(config.mode) } },
  promptLabel: `${ui.user(text.you)} `,
  welcomeMessage: text.welcome,
});
```

`messagesFor(language)` da los textos propios del kit en un idioma (los nombres de los modos, arriba), con el inglés para lo que falte.

## Lo que se queda en inglés {#what-stays-in-english}

El texto para el modelo: las descripciones de las herramientas, los motivos de denegación de los hooks, la sección de la base de conocimiento, la propia línea del idioma de respuesta (salvo el nombre del idioma). Varios están ajustados a comportamientos del SDK comprobados a mano, y el inglés es lo que el modelo sigue de forma más fiable.

## Añadir un idioma {#adding-a-language}

Los catálogos están en `src/core/messages/` del kit, un fichero por idioma, tipado contra el inglés; un test comprueba que cada catálogo tiene todas las claves. Las contribuciones son bienvenidas: añade el catálogo y su código a `SUPPORTED_LANGUAGES`, y comprueba que la barra de estado más cargada sigue cabiendo en 80 columnas.
