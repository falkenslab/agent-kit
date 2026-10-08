// Starts an external extension's MCP server (ADR-025, #37) with a clean environment: the SDK
// merges a server's `env` with the agent's own (confirmed empirically), so the kit starts this
// launcher instead, which keeps only the variables the system needs and those the extension
// declares, then loads the server in this same process.
//
// Usage: node extension-launcher.mjs <server script> <JSON array of variable names it may see> [its arguments…]
import { pathToFileURL } from "node:url";

const [entry, declared = "[]", ...args] = process.argv.slice(2);
if (!entry) {
  console.error("extension-launcher: no server entry given");
  process.exit(1);
}

// What any process may need to run, on Windows and elsewhere; never a credential. Where programs
// are installed and the desktop session too: a browser is found through PROGRAMFILES on Windows
// (Playwright found no Edge without them, #52) and opens a window through DISPLAY on Linux.
const SYSTEM = [
  "PATH", "PATHEXT", "SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "COMSPEC", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "LANG", "LC_ALL", "TZ",
  "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMW6432", "COMMONPROGRAMFILES", "COMMONPROGRAMFILES(X86)", "COMMONPROGRAMW6432", "PROGRAMDATA", "ALLUSERSPROFILE",
  "HOMEDRIVE", "HOMEPATH", "USERNAME", "USER", "LOGNAME", "OS", "PROCESSOR_ARCHITECTURE", "NUMBER_OF_PROCESSORS",
  "DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "DBUS_SESSION_BUS_ADDRESS",
];
const allowed = new Set([...SYSTEM, ...JSON.parse(declared)].map((name) => name.toUpperCase()));
for (const name of Object.keys(process.env)) {
  if (!allowed.has(name.toUpperCase())) delete process.env[name];
}

// The server reads its own arguments from argv: its own, none of the launcher's.
process.argv = [process.argv[0], entry, ...args];
await import(pathToFileURL(entry).href);
