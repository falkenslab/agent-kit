import type { Language } from "../../core/language.js";
import { getLanguage, type ToolPhrase } from "../../core/messages/index.js";
import type { ToolLabels } from "../../core/toolLabels.js";

type MemoryTool = "list" | "read" | "save" | "forget";

/** The memory_* tools' texts in the chat, in each of the kit's languages. */
interface MemoryLabels {
  list: string;
  read(entry: string): string;
  save(entry: string): string;
  forget(entry: string): string;
  phrases: Record<MemoryTool, ToolPhrase>;
}

const TEXTS: Record<Language, MemoryLabels> = {
  en: {
    list: "Looking through what it remembers of you",
    read: (entry) => `Recalling "${entry}"`,
    save: (entry) => `Remembering "${entry}"`,
    forget: (entry) => `Forgetting "${entry}"`,
    phrases: {
      list: ["looked through its memory", "looked through its memory {n} times"],
      read: ["recalled {n} memory", "recalled {n} memories"],
      save: ["remembered {n} thing", "remembered {n} things"],
      forget: ["forgot {n} thing", "forgot {n} things"],
    },
  },
  es: {
    list: "Repasando lo que recuerda de ti",
    read: (entry) => `Recordando "${entry}"`,
    save: (entry) => `Guardando en su memoria "${entry}"`,
    forget: (entry) => `Olvidando "${entry}"`,
    phrases: {
      list: ["repasó su memoria", "repasó su memoria {n} veces"],
      read: ["recordó {n} cosa", "recordó {n} cosas"],
      save: ["guardó {n} recuerdo", "guardó {n} recuerdos"],
      forget: ["olvidó {n} recuerdo", "olvidó {n} recuerdos"],
    },
  },
  fr: {
    list: "Parcourt ce qu'il retient de vous",
    read: (entry) => `Se souvient de "${entry}"`,
    save: (entry) => `Retient "${entry}"`,
    forget: (entry) => `Oublie "${entry}"`,
    phrases: {
      list: ["a parcouru sa mémoire", "a parcouru sa mémoire {n} fois"],
      read: ["s'est souvenu de {n} chose", "s'est souvenu de {n} choses"],
      save: ["a retenu {n} chose", "a retenu {n} choses"],
      forget: ["a oublié {n} chose", "a oublié {n} choses"],
    },
  },
  de: {
    list: "Durchsucht, was er sich über dich gemerkt hat",
    read: (entry) => `Erinnert sich an "${entry}"`,
    save: (entry) => `Merkt sich "${entry}"`,
    forget: (entry) => `Vergisst "${entry}"`,
    phrases: {
      list: ["Gedächtnis durchsucht", "Gedächtnis {n}-mal durchsucht"],
      read: ["an {n} Sache erinnert", "an {n} Sachen erinnert"],
      save: ["{n} Sache gemerkt", "{n} Sachen gemerkt"],
      forget: ["{n} Sache vergessen", "{n} Sachen vergessen"],
    },
  },
};

/** How the chat shows the memory_* tools (server `memory`), in the kit's language. */
export function memoryToolLabels(): ToolLabels {
  const texts = TEXTS[getLanguage()];
  const entry = (input: Record<string, unknown>): string => (typeof input.name === "string" ? input.name : "");
  const labels: Record<MemoryTool, (input: Record<string, unknown>) => string> = {
    list: () => texts.list,
    read: (input) => texts.read(entry(input)),
    save: (input) => texts.save(entry(input)),
    forget: (input) => texts.forget(entry(input)),
  };
  return Object.fromEntries((Object.keys(labels) as MemoryTool[]).map((tool) => [`mcp__memory__memory_${tool}`, { label: labels[tool], phrase: texts.phrases[tool] }]));
}
