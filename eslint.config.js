import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// Extensions (ADR-025): the core never imports one, not even a type (an agent enables them through
// their factories, exported from src/index.ts), and no extension imports another; each owns its
// data. Extensions use the core's types.
const EXTENSIONS = ["awareness", "knowledge", "memory", "sources"];

export default tseslint.config(
  { ignores: ["dist/**", "examples/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    files: ["src/core/**/*.ts", "src/tui/**/*.ts", "src/tui/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/extensions/*/**"], allowTypeImports: false, message: "The core never imports an extension: an agent enables them through their factories (ADR-025, #50)." }] },
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
