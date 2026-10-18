import type { Language } from "../../core/language.js";
import { getLanguage, type ToolPhrase } from "../../core/messages/index.js";
import type { ToolLabels } from "../../core/toolLabels.js";

/** The awareness's tool's texts in the chat, in each of the kit's languages. */
interface AwarenessLabels {
  now: string;
  guide: string;
  phrase: ToolPhrase;
  /** The catalog (#64): looking, and looking for what's new online. */
  catalog: string;
  catalogNew: string;
  catalogPhrase: ToolPhrase;
}

const TEXTS: Record<Language, AwarenessLabels> = {
  en: { now: "Looking at itself", guide: "Reading its own guide", phrase: ["looked at itself", "looked at itself {n} times"], catalog: "Looking at its extensions", catalogNew: "Looking for new extensions", catalogPhrase: ["looked at its extensions", "looked at its extensions {n} times"] },
  es: { now: "Mirándose a sí mismo", guide: "Leyendo su propia guía", phrase: ["se miró a sí mismo", "se miró a sí mismo {n} veces"], catalog: "Mirando sus extensiones", catalogNew: "Buscando extensiones nuevas", catalogPhrase: ["miró sus extensiones", "miró sus extensiones {n} veces"] },
  fr: { now: "Se regarde lui-même", guide: "Lit son propre guide", phrase: ["s'est regardé lui-même", "s'est regardé lui-même {n} fois"], catalog: "Regarde ses extensions", catalogNew: "Cherche de nouvelles extensions", catalogPhrase: ["a regardé ses extensions", "a regardé ses extensions {n} fois"] },
  de: { now: "Betrachtet sich selbst", guide: "Liest seine eigene Anleitung", phrase: ["sich selbst betrachtet", "sich selbst {n}-mal betrachtet"], catalog: "Sieht seine Erweiterungen an", catalogNew: "Sucht neue Erweiterungen", catalogPhrase: ["seine Erweiterungen angesehen", "seine Erweiterungen {n}-mal angesehen"] },
};

/** How the chat shows the awareness's tool (server `awareness`), in the kit's language. */
export function awarenessToolLabels(): ToolLabels {
  const texts = TEXTS[getLanguage()];
  return {
    mcp__awareness__about_me: { label: (input) => (input.part === "guide" ? texts.guide : texts.now), phrase: texts.phrase },
    mcp__awareness__extensions_catalog: { label: (input) => (input.refresh ? texts.catalogNew : texts.catalog), phrase: texts.catalogPhrase },
  };
}
