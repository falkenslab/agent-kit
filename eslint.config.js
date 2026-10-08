import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// Extensions (ADR-025): the core imports none but through its registry (src/core/extensions.ts),
// and no extension imports another; each owns its data. Type-only imports are allowed: the core's
// `AgentSpec` names the knowledge base's types, and extensions use the core's.
const EXTENSIONS = ["awareness", "knowledge", "memory", "sources"];

export default tseslint.config(
  { ignores: ["dist/**", "examples/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    files: ["src/core/**/*.ts", "src/tui/**/*.ts", "src/tui/**/*.tsx"],
    ignores: ["src/core/extensions.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/extensions/*/**"], allowTypeImports: true, message: "The core reaches extensions only through src/core/extensions.ts (ADR-025)." }] },
      ],
    },
  },
  ...EXTENSIONS.map((extension) => ({
    files: [`src/extensions/${extension}/**/*.ts`],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: EXTENSIONS.filter((other) => other !== extension).map((other) => ({
            group: [`../${other}/**`, `**/extensions/${other}/**`],
            allowTypeImports: false,
            message: "An extension never imports another: each owns its data, and the model connects them (#30, ADR-025).",
          })),
        },
      ],
    },
  })),
);
