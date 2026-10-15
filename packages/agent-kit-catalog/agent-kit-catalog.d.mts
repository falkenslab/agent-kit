/** One extension in a marketplace's catalog.json (agent-kit's schemas/marketplace-catalog.schema.json). */
export interface CatalogExtension {
  name: string;
  version: string;
  description: string;
  category: string | null;
  /** Its plugin.json's keywords and its entry's tags, keywords and category, lowercased, without repeats. */
  topics: string[];
  author: string | null;
  license: string | null;
  homepage: string;
  readme: string;
  install: { claudeCode: string; agentKit: string };
  logo?: string;
  banner?: string;
}

/** A marketplace's catalog.json. */
export interface Catalog {
  marketplace: string;
  description: string;
  repository: string;
  add: { claudeCode: string; agentKit: string };
  extensions: CatalogExtension[];
}

/** What's wrong with an extension's metadata["agent-kit"], as agent-kit's agent-kit-metadata.schema.json says; none when it fits. */
export function metadataProblems(kit: unknown): string[];

/**
 * The catalog of the marketplace in `root`: throws saying everything that keeps it from being
 * written. `repo` (owner/name) and `branch` (main by default) are where its links point.
 */
export function buildCatalog(root: string, options?: { repo?: string; branch?: string }): Promise<Catalog>;

/** catalog.json's text: two-space JSON and a final newline. */
export function catalogText(catalog: Catalog): string;
