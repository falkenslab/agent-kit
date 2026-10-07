// Starts an external extension's MCP server (ADR-025, #37) with a clean environment: the SDK
// merges a server's `env` with the agent's own (confirmed empirically), so the kit starts this
// launcher instead, which keeps only the variables the system needs and those the extension
// declares, then loads the server in this same process.
//
// Usage: node extension-launcher.mjs <server entry> <JSON array of variable names it may see>
import { pathToFileURL } from "node:url";

const [entry, declared = "[]"] = process.argv.slice(2);
if (!entry) {
  console.error("extension-launcher: no server entry given");
  process.exit(1);
}

// What any process may need to run, on Windows and elsewhere; never a credential.
const SYSTEM = ["PATH", "PATHEXT", "SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "COMSPEC", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "LANG", "LC_ALL", "TZ"];
const allowed = new Set([...SYSTEM, ...JSON.parse(declared)].map((name) => name.toUpperCase()));
for (const name of Object.keys(process.env)) {
  if (!allowed.has(name.toUpperCase())) delete process.env[name];
}

// The server reads its own arguments from argv: it gets none of the launcher's.
process.argv = [process.argv[0], entry];
await import(pathToFileURL(entry).href);
