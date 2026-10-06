/** The languages the kit's own texts come in. */
export type Language = "en" | "es" | "fr" | "de";

/** The language codes the kit's texts come in. */
export const SUPPORTED_LANGUAGES: readonly Language[] = ["en", "es", "fr", "de"];

/** Each language's name in English, as the model is told it (the kit's text for the model stays in English). */
export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", es: "Spanish", fr: "French", de: "German" };

/** Where the language can come from, in order of precedence. */
export interface LanguageSources {
  /** The process's arguments; `--language=<code>` wins over everything else. */
  argv?: readonly string[];
  /** The agent's own choice (its code or configuration). */
  option?: string;
  /** The system's locale, e.g. "es-ES" (`Intl`). */
  locale?: string;
  /** The environment, for `LC_ALL`, `LC_MESSAGES` and `LANG` (e.g. "fr_FR.UTF-8"). */
  env?: Readonly<Record<string, string | undefined>>;
}

/** The result of `resolveLanguage()`: the language to use and why any asked-for code was skipped. */
export interface ResolvedLanguage {
  language: Language;
  /** One line per code that was asked for and isn't supported (English text, for the caller to show). */
  warnings: string[];
}

/** "es", "ES", "es-ES", "es_ES.UTF-8" → "es"; anything unsupported → null. */
export function toLanguage(code: string | undefined): Language | null {
  const base = code?.trim().toLowerCase().split(/[-_.@]/)[0];
  return SUPPORTED_LANGUAGES.find((language) => language === base) ?? null;
}

/** The value of `--language=<code>` (or `--language <code>`) in `argv`, if any. */
export function languageArgument(argv: readonly string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--language=")) return arg.slice("--language=".length);
    if (arg === "--language") return argv[i + 1];
  }
  return undefined;
}

/**
 * The language for the kit's texts and the agent's replies: `--language=<code>`, then the
 * agent's option, then the system's language, then English. A code that is asked for but
 * isn't supported falls through to the next source, with a warning. Pure: `detectLanguage()`
 * fills the sources from the running process.
 */
export function resolveLanguage(sources: LanguageSources): ResolvedLanguage {
  const warnings: string[] = [];
  const asked = (code: string | undefined, from: string): Language | null => {
    if (code === undefined || code.trim() === "") return null;
    const language = toLanguage(code);
    if (!language) warnings.push(`Unsupported language "${code}" (${from}); supported: ${SUPPORTED_LANGUAGES.join(", ")}.`);
    return language;
  };
  const env = sources.env ?? {};
  const system = [sources.locale, env.LC_ALL, env.LC_MESSAGES, env.LANG].map(toLanguage).find((language) => language !== null);
  const language =
    asked(sources.argv ? languageArgument(sources.argv) : undefined, "--language") ?? asked(sources.option, "language option") ?? system ?? "en";
  return { language, warnings };
}

/** `resolveLanguage()` with the running process's arguments, locale and environment. */
export function detectLanguage(option?: string): ResolvedLanguage {
  let locale: string | undefined;
  try {
    locale = Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    locale = undefined;
  }
  return resolveLanguage({ argv: process.argv.slice(2), option, locale, env: process.env });
}

/**
 * The line appended to the agent's (and each subagent's) prompt so it answers in the
 * resolved language, but follows the human if they write in another one.
 */
export function replyLanguageInstruction(language: Language): string {
  const name = LANGUAGE_NAMES[language];
  return `Language: use ${name} both to reply and for everything you keep (knowledge base pages, preferences, notes, the log), whatever language these instructions, your skills, your sources or the human's name are in. Switch both to another language only when the human's message is clearly written in it; a greeting, a slash command or a single word doesn't count.`;
}
