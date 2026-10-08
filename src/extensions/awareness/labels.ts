import type { Language } from "../../core/language.js";
import { getLanguage, type ToolPhrase } from "../../core/messages/index.js";
import type { ToolLabels } from "../../core/toolLabels.js";

/** The awareness's tool's texts in the chat, in each of the kit's languages. */
interface AwarenessLabels {
  now: string;
  guide: string;
  phrase: ToolPhrase;
}

const TEXTS: Record<Language, AwarenessLabels> = {
  en: { now: "Looking at itself", guide: "Reading its own guide", phrase: ["looked at itself", "looked at itself {n} times"] },
  es: { now: "Mirándose a sí mismo", guide: "Leyendo su propia guía", phrase: ["se miró a sí mismo", "se miró a sí mismo {n} veces"] },
  fr: { now: "Se regarde lui-même", guide: "Lit son propre guide", phrase: ["s'est regardé lui-même", "s'est regardé lui-même {n} fois"] },
  de: { now: "Betrachtet sich selbst", guide: "Liest seine eigene Anleitung", phrase: ["sich selbst betrachtet", "sich selbst {n}-mal betrachtet"] },
};

/** How the chat shows the awareness's tool (server `awareness`), in the kit's language. */
export function awarenessToolLabels(): ToolLabels {
  const texts = TEXTS[getLanguage()];
  return { mcp__awareness__about_me: { label: (input) => (input.part === "guide" ? texts.guide : texts.now), phrase: texts.phrase } };
}
