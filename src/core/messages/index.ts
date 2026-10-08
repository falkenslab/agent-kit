import { detectLanguage, type Language } from "../language.js";
import { en, type Messages } from "./en.js";
import { es } from "./es.js";
import { fr } from "./fr.js";
import { de } from "./de.js";

export type { Messages, ToolPhrase } from "./en.js";

const CATALOGS: Record<Language, Partial<Messages>> = { en, es, fr, de };

/** A language's texts; any it lacks come from English (nested groups key by key). */
export function messagesFor(language: Language): Messages {
  return withEnglishFallback(CATALOGS[language]);
}

/** A catalog completed with the English text for every key it lacks. */
export function withEnglishFallback(own: Partial<Messages>): Messages {
  return {
    ...en,
    ...own,
    labels: { ...en.labels, ...own.labels },
    auth: { ...en.auth, ...own.auth },
    toolPhrases: { ...en.toolPhrases, ...own.toolPhrases },
  };
}

// One language per process: `--language` and the system's language are the process's, and
// an agent has one. English until something chooses (tests, a component used on its own).
let current: Language = "en";
let messages: Messages = en;
let chosen = false;
// A language switched to on purpose (switchLanguage()): kept over --language and options.
let switched = false;
let pendingWarnings: string[] = [];
const warned = new Set<string>();

/** Sets the language of the kit's texts directly (a host that resolved it itself, tests). */
export function setLanguage(language: Language): void {
  current = language;
  messages = messagesFor(language);
  chosen = true;
}

/** The language of the kit's texts right now. */
export function getLanguage(): Language {
  return current;
}

/**
 * Resolves the language from `--language`, `option` and the system's (see language.ts) and
 * makes it the kit's, the first time or whenever an option is given; otherwise keeps the one
 * already chosen (so a chat started without `language` follows `buildSessionOptions()`'s
 * `config.language`). Warnings for unsupported codes wait in `takeLanguageWarnings()`, each
 * once per process.
 */
export function chooseLanguage(option?: string): Language {
  if (switched || (chosen && option === undefined)) return current;
  const resolved = detectLanguage(option);
  for (const warning of resolved.warnings) {
    if (warned.has(warning)) continue;
    warned.add(warning);
    pendingWarnings.push(warning);
  }
  setLanguage(resolved.language);
  return current;
}

/**
 * Switches the kit's language on purpose, e.g. the person picked another in a chat (#47): from
 * then on it wins over `--language` and `config.language`, until switched again. The session
 * says so to the model when it opens next (the controller's `setLanguage()` reopens it).
 */
export function switchLanguage(language: Language): void {
  setLanguage(language);
  switched = true;
}

/** Warnings about unsupported language codes not shown yet (English, one line each). */
export function takeLanguageWarnings(): string[] {
  const taken = pendingWarnings;
  pendingWarnings = [];
  return taken;
}

/** The kit's texts in the current language. */
export function t(): Messages {
  return messages;
}
