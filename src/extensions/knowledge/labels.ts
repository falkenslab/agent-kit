import type { Language } from "../../core/language.js";
import { getLanguage, t, type ToolPhrase } from "../../core/messages/index.js";
import { truncate, type ToolLabels } from "../../core/toolLabels.js";

type KnowledgeTool = "index" | "search" | "read" | "create" | "edit" | "rewrite" | "supersede" | "retire" | "log" | "check";

/** The knowledge_* tools' texts in the chat, in each of the kit's languages. */
interface KnowledgeLabels {
  index: string;
  search(query: string): string;
  read(page: string): string;
  create(page: string): string;
  edit(page: string): string;
  rewrite(page: string): string;
  supersede(page: string): string;
  retire(page: string): string;
  log: string;
  check: string;
  phrases: Record<KnowledgeTool, ToolPhrase>;
}

const TEXTS: Record<Language, KnowledgeLabels> = {
  en: {
    index: "Reading the knowledge base's index",
    search: (query) => `Searching the knowledge base for "${query}"`,
    read: (page) => `Reading ${page}`,
    create: (page) => `Creating ${page}`,
    edit: (page) => `Editing ${page}`,
    rewrite: (page) => `Rewriting ${page}`,
    supersede: (page) => `Marking ${page} superseded`,
    retire: (page) => `Retiring ${page}`,
    log: "Updating the knowledge base's log",
    check: "Checking the knowledge base",
    phrases: {
      index: ["read the index", "read the index {n} times"],
      search: ["searched the knowledge base", "searched the knowledge base {n} times"],
      read: ["read {n} page", "read {n} pages"],
      create: ["created {n} page", "created {n} pages"],
      edit: ["edited {n} page", "edited {n} pages"],
      rewrite: ["rewrote {n} page", "rewrote {n} pages"],
      supersede: ["superseded {n} page", "superseded {n} pages"],
      retire: ["retired {n} page", "retired {n} pages"],
      log: ["updated the log", "updated the log {n} times"],
      check: ["checked the knowledge base", "checked the knowledge base {n} times"],
    },
  },
  es: {
    index: "Leyendo el índice de la base de conocimiento",
    search: (query) => `Buscando "${query}" en la base de conocimiento`,
    read: (page) => `Leyendo ${page}`,
    create: (page) => `Creando ${page}`,
    edit: (page) => `Editando ${page}`,
    rewrite: (page) => `Reescribiendo ${page}`,
    supersede: (page) => `Marcando ${page} como sustituida`,
    retire: (page) => `Retirando ${page}`,
    log: "Actualizando el registro de la base de conocimiento",
    check: "Revisando la base de conocimiento",
    phrases: {
      index: ["leyó el índice", "leyó el índice {n} veces"],
      search: ["buscó en la base de conocimiento", "buscó en la base de conocimiento {n} veces"],
      read: ["leyó {n} página", "leyó {n} páginas"],
      create: ["creó {n} página", "creó {n} páginas"],
      edit: ["editó {n} página", "editó {n} páginas"],
      rewrite: ["reescribió {n} página", "reescribió {n} páginas"],
      supersede: ["sustituyó {n} página", "sustituyó {n} páginas"],
      retire: ["retiró {n} página", "retiró {n} páginas"],
      log: ["actualizó el registro", "actualizó el registro {n} veces"],
      check: ["revisó la base de conocimiento", "revisó la base de conocimiento {n} veces"],
    },
  },
  fr: {
    index: "Lecture de l'index de la base de connaissances",
    search: (query) => `Recherche de "${query}" dans la base de connaissances`,
    read: (page) => `Lecture de ${page}`,
    create: (page) => `Création de ${page}`,
    edit: (page) => `Modification de ${page}`,
    rewrite: (page) => `Réécriture de ${page}`,
    supersede: (page) => `${page} marquée comme remplacée`,
    retire: (page) => `Retrait de ${page}`,
    log: "Mise à jour du journal de la base de connaissances",
    check: "Vérification de la base de connaissances",
    phrases: {
      index: ["a lu l'index", "a lu l'index {n} fois"],
      search: ["a cherché dans la base", "a cherché dans la base {n} fois"],
      read: ["a lu {n} page", "a lu {n} pages"],
      create: ["a créé {n} page", "a créé {n} pages"],
      edit: ["a modifié {n} page", "a modifié {n} pages"],
      rewrite: ["a réécrit {n} page", "a réécrit {n} pages"],
      supersede: ["a remplacé {n} page", "a remplacé {n} pages"],
      retire: ["a retiré {n} page", "a retiré {n} pages"],
      log: ["a mis à jour le journal", "a mis à jour le journal {n} fois"],
      check: ["a vérifié la base", "a vérifié la base {n} fois"],
    },
  },
  de: {
    index: "Index der Wissensbasis lesen",
    search: (query) => `Wissensbasis nach "${query}" durchsuchen`,
    read: (page) => `${page} lesen`,
    create: (page) => `${page} anlegen`,
    edit: (page) => `${page} bearbeiten`,
    rewrite: (page) => `${page} neu schreiben`,
    supersede: (page) => `${page} als ersetzt markieren`,
    retire: (page) => `${page} zurückziehen`,
    log: "Protokoll der Wissensbasis aktualisieren",
    check: "Wissensbasis prüfen",
    phrases: {
      index: ["Index gelesen", "Index {n}-mal gelesen"],
      search: ["Wissensbasis durchsucht", "Wissensbasis {n}-mal durchsucht"],
      read: ["{n} Seite gelesen", "{n} Seiten gelesen"],
      create: ["{n} Seite angelegt", "{n} Seiten angelegt"],
      edit: ["{n} Seite bearbeitet", "{n} Seiten bearbeitet"],
      rewrite: ["{n} Seite neu geschrieben", "{n} Seiten neu geschrieben"],
      supersede: ["{n} Seite ersetzt", "{n} Seiten ersetzt"],
      retire: ["{n} Seite zurückgezogen", "{n} Seiten zurückgezogen"],
      log: ["Protokoll aktualisiert", "Protokoll {n}-mal aktualisiert"],
      check: ["Wissensbasis geprüft", "Wissensbasis {n}-mal geprüft"],
    },
  },
};

/** How the chat shows the knowledge_* tools (server `knowledge`), in the kit's language. */
export function knowledgeToolLabels(): ToolLabels {
  const texts = TEXTS[getLanguage()];
  const text = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);
  const page = (input: Record<string, unknown>): string => text(input.page, t().labels.aPage);
  const labels: Record<KnowledgeTool, (input: Record<string, unknown>) => string> = {
    index: () => texts.index,
    search: (input) => texts.search(truncate(text(input.query, ""), 60)),
    read: (input) => texts.read(page(input)),
    create: (input) => texts.create(`${text(input.type, "")}/${text(input.slug, "")}`),
    edit: (input) => texts.edit(page(input)),
    rewrite: (input) => texts.rewrite(page(input)),
    supersede: (input) => texts.supersede(page(input)),
    retire: (input) => texts.retire(page(input)),
    log: () => texts.log,
    check: () => texts.check,
  };
  return Object.fromEntries(
    (Object.keys(labels) as KnowledgeTool[]).map((tool) => [`mcp__knowledge__knowledge_${tool}`, { label: labels[tool], phrase: texts.phrases[tool] }]),
  );
}
