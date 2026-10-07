import type { Language } from "../../core/language.js";
import { getLanguage, t, type ToolPhrase } from "../../core/messages/index.js";
import { truncate, truncatePath, type ToolLabels } from "../../core/toolLabels.js";

/** The sources tools' texts in the chat, in each of the kit's languages. */
interface SourcesLabels {
  listing: string;
  extracting(source: string): string;
  saving(destination: string): string;
  downloading(url: string): string;
  requesting(description: string): string;
  retiring(source: string): string;
  phrases: Record<"list_sources" | "extract_text" | "save_to_sources" | "download_to_sources" | "request_file" | "retire_source", ToolPhrase>;
}

const TEXTS: Record<Language, SourcesLabels> = {
  en: {
    listing: "Listing the sources",
    extracting: (source) => `Reading ${source}`,
    saving: (destination) => `Saving ${destination} to the sources`,
    downloading: (url) => `Downloading ${url} to the sources`,
    requesting: (description) => `Asking for a file: ${description}`,
    retiring: (source) => `Retiring the source ${source}`,
    phrases: {
      list_sources: ["listed the sources", "listed the sources {n} times"],
      extract_text: ["read {n} document", "read {n} documents"],
      save_to_sources: ["saved {n} source", "saved {n} sources"],
      download_to_sources: ["downloaded {n} source", "downloaded {n} sources"],
      request_file: ["asked for {n} file", "asked for {n} files"],
      retire_source: ["retired {n} source", "retired {n} sources"],
    },
  },
  es: {
    listing: "Revisando las fuentes",
    extracting: (source) => `Leyendo ${source}`,
    saving: (destination) => `Guardando ${destination} en las fuentes`,
    downloading: (url) => `Descargando ${url} a las fuentes`,
    requesting: (description) => `Pidiendo un fichero: ${description}`,
    retiring: (source) => `Retirando la fuente ${source}`,
    phrases: {
      list_sources: ["revisó las fuentes", "revisó las fuentes {n} veces"],
      extract_text: ["leyó {n} documento", "leyó {n} documentos"],
      save_to_sources: ["guardó {n} fuente", "guardó {n} fuentes"],
      download_to_sources: ["descargó {n} fuente", "descargó {n} fuentes"],
      request_file: ["pidió {n} fichero", "pidió {n} ficheros"],
      retire_source: ["retiró {n} fuente", "retiró {n} fuentes"],
    },
  },
  fr: {
    listing: "Examen des sources",
    extracting: (source) => `Lecture de ${source}`,
    saving: (destination) => `Enregistrement de ${destination} dans les sources`,
    downloading: (url) => `Téléchargement de ${url} dans les sources`,
    requesting: (description) => `Demande d'un fichier : ${description}`,
    retiring: (source) => `Retrait de la source ${source}`,
    phrases: {
      list_sources: ["a examiné les sources", "a examiné les sources {n} fois"],
      extract_text: ["a lu {n} document", "a lu {n} documents"],
      save_to_sources: ["a enregistré {n} source", "a enregistré {n} sources"],
      download_to_sources: ["a téléchargé {n} source", "a téléchargé {n} sources"],
      request_file: ["a demandé {n} fichier", "a demandé {n} fichiers"],
      retire_source: ["a retiré {n} source", "a retiré {n} sources"],
    },
  },
  de: {
    listing: "Quellen prüfen",
    extracting: (source) => `${source} lesen`,
    saving: (destination) => `Speichert ${destination} in den Quellen`,
    downloading: (url) => `${url} in die Quellen herunterladen`,
    requesting: (description) => `Um eine Datei bitten: ${description}`,
    retiring: (source) => `Quelle ${source} zurückziehen`,
    phrases: {
      list_sources: ["Quellen geprüft", "Quellen {n}-mal geprüft"],
      extract_text: ["{n} Dokument gelesen", "{n} Dokumente gelesen"],
      save_to_sources: ["{n} Quelle gespeichert", "{n} Quellen gespeichert"],
      download_to_sources: ["{n} Quelle heruntergeladen", "{n} Quellen heruntergeladen"],
      request_file: ["um {n} Datei gebeten", "um {n} Dateien gebeten"],
      retire_source: ["{n} Quelle zurückgezogen", "{n} Quellen zurückgezogen"],
    },
  },
};

/** How the chat shows the sources tools (server `sourceFiles`), in the kit's language. */
export function sourcesToolLabels(): ToolLabels {
  const texts = TEXTS[getLanguage()];
  const text = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);
  const tool = (name: keyof SourcesLabels["phrases"]) => `mcp__sourceFiles__${name}`;
  return {
    [tool("list_sources")]: { label: () => texts.listing, phrase: texts.phrases.list_sources },
    [tool("extract_text")]: { label: (input) => texts.extracting(truncatePath(text(input.source, t().labels.aFile), 70)), phrase: texts.phrases.extract_text },
    [tool("save_to_sources")]: { label: (input) => texts.saving(truncatePath(text(input.destination, ""), 70)), phrase: texts.phrases.save_to_sources },
    [tool("download_to_sources")]: { label: (input) => texts.downloading(truncate(text(input.url, t().labels.aPage), 80)), phrase: texts.phrases.download_to_sources },
    [tool("request_file")]: { label: (input) => texts.requesting(truncate(text(input.description, ""), 100)), phrase: texts.phrases.request_file },
    [tool("retire_source")]: { label: (input) => texts.retiring(truncatePath(text(input.source, ""), 70)), phrase: texts.phrases.retire_source },
  };
}
