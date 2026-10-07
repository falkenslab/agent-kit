import type { Language } from "../../core/language.js";
import { getLanguage, type ToolPhrase } from "../../core/messages/index.js";
import type { ToolLabels } from "../../core/toolLabels.js";

type MemoryTool = "recall" | "remember" | "forget";

/** The memory's tools' texts in the chat, in each of the kit's languages. */
interface MemoryLabels {
  list: string;
  read(entry: string): string;
  remember(entry: string): string;
  forget(entry: string): string;
  phrases: Record<MemoryTool, ToolPhrase>;
}

const TEXTS: Record<Language, MemoryLabels> = {
  en: {
    list: "Looking through what it remembers of you",
    read: (entry) => `Recalling "${entry}"`,
    remember: (entry) => `Remembering "${entry}"`,
    forget: (entry) => `Forgetting "${entry}"`,
    phrases: {
      recall: ["looked through its memory", "looked through its memory {n} times"],
      remember: ["remembered {n} thing", "remembered {n} things"],
      forget: ["forgot {n} thing", "forgot {n} things"],
    },
  },
  es: {
    list: "Repasando lo que recuerda de ti",
    read: (entry) => `Recordando "${entry}"`,
    remember: (entry) => `Guardando en su memoria "${entry}"`,
    forget: (entry) => `Olvidando "${entry}"`,
    phrases: {
      recall: ["repasó su memoria", "repasó su memoria {n} veces"],
      remember: ["guardó {n} recuerdo", "guardó {n} recuerdos"],
      forget: ["olvidó {n} recuerdo", "olvidó {n} recuerdos"],
    },
  },
  fr: {
    list: "Parcourt ce qu'il retient de vous",
    read: (entry) => `Se souvient de "${entry}"`,
    remember: (entry) => `Retient "${entry}"`,
    forget: (entry) => `Oublie "${entry}"`,
    phrases: {
      recall: ["a parcouru sa mémoire", "a parcouru sa mémoire {n} fois"],
      remember: ["a retenu {n} chose", "a retenu {n} choses"],
      forget: ["a oublié {n} chose", "a oublié {n} choses"],
    },
  },
  de: {
    list: "Durchsucht, was er sich über dich gemerkt hat",
    read: (entry) => `Erinnert sich an "${entry}"`,
    remember: (entry) => `Merkt sich "${entry}"`,
    forget: (entry) => `Vergisst "${entry}"`,
    phrases: {
      recall: ["Gedächtnis durchsucht", "Gedächtnis {n}-mal durchsucht"],
      remember: ["{n} Sache gemerkt", "{n} Sachen gemerkt"],
      forget: ["{n} Sache vergessen", "{n} Sachen vergessen"],
    },
  },
};

/** How the chat shows the memory's tools (server `memory`), in the kit's language. */
export function memoryToolLabels(): ToolLabels {
  const texts = TEXTS[getLanguage()];
  const entry = (input: Record<string, unknown>): string => (typeof input.name === "string" ? input.name : "");
  const labels: Record<MemoryTool, (input: Record<string, unknown>) => string> = {
    recall: (input) => (entry(input) ? texts.read(entry(input)) : texts.list),
    remember: (input) => texts.remember(entry(input)),
    forget: (input) => texts.forget(entry(input)),
  };
  return Object.fromEntries((Object.keys(labels) as MemoryTool[]).map((tool) => [`mcp__memory__${tool}`, { label: labels[tool], phrase: texts.phrases[tool] }]));
}
