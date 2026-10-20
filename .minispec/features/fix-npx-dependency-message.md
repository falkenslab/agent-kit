# An npx package's dependencies are reported missing when they're bundled

Issue: [#71](https://github.com/falkenslab/agent-kit/issues/71)

## Problem

- An npx package that bundles a dependency into its `bin` (esbuild) but still lists it in `dependencies` is refused with "has dependencies it doesn't bring (gift-pegjs, parse5): the kit installs none, so a package must bundle them, or list them in bundleDependencies".
- It reads as if they were absent. With `@falkenslab/moodle-mcp@0.4.0` (falkenslab/moodle-mcp#48) its `server.mjs` contained both, and the message misled the diagnosis.

## Cause

`packageBin()` (`src/core/npxPackages.ts`) reads `package.json` only: whatever is in `dependencies` and not in `bundleDependencies` counts as not brought. The rule is right (the kit installs no dependencies, ADR-025); the message only tells one of the two ways out.

## Solution

- Keep the rule; the message says both fixes: "declares dependencies it doesn't bring (gift-pegjs, parse5): the kit installs none. If they're bundled into its program, move them to devDependencies; otherwise list them in bundleDependencies."
- The same advice in the docs where publishing an npx server is explained (Writing an extension, "A server published to npm"; English and Spanish).
- Detecting real imports in the `bin` is left out: dynamic imports and computed `require`s make it unreliable.

## Verification

- The npx packages test checks the new message.
- `verify` passes.
