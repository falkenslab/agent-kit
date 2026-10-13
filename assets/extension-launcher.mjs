// Starts an external extension's MCP server (ADR-025, #37) with a clean environment: the SDK
// merges a server's `env` with the agent's own (confirmed empirically), so the kit starts this
// launcher instead, which keeps only the variables the system needs and those the extension
// declares, then loads the server in this same process. Its options' values (#55) are read here,
// when the server starts, so one changed while a session runs reaches the server started again.
//
// Usage: node extension-launcher.mjs <server script> <spec> [its arguments…]
// where <spec> is JSON: { "keep": [variables it may see], "options"?: { "lock", "secrets", "name", "defaults" } }.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [entry, specText = "{}", ...args] = process.argv.slice(2);
if (!entry) {
  console.error("extension-launcher: no server entry given");
  process.exit(1);
}
const spec = JSON.parse(specText);
const declared = spec.keep ?? [];

// What any process may need to run, on Windows and elsewhere; never a credential. Where programs
// are installed and the desktop session too: a browser is found through PROGRAMFILES on Windows
// (Playwright found no Edge without them, #52) and opens a window through DISPLAY on Linux.
const SYSTEM = [
  "PATH", "PATHEXT", "SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "COMSPEC", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "LANG", "LC_ALL", "TZ",
  "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMW6432", "COMMONPROGRAMFILES", "COMMONPROGRAMFILES(X86)", "COMMONPROGRAMW6432", "PROGRAMDATA", "ALLUSERSPROFILE",
  "HOMEDRIVE", "HOMEPATH", "USERNAME", "USER", "LOGNAME", "OS", "PROCESSOR_ARCHITECTURE", "NUMBER_OF_PROCESSORS",
  "DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "DBUS_SESSION_BUS_ADDRESS",
];
const allowed = new Set([...SYSTEM, ...declared].map((name) => name.toUpperCase()));
for (const name of Object.keys(process.env)) {
  if (!allowed.has(name.toUpperCase())) delete process.env[name];
}

// Its options' values now: the lock's, the secrets', else the defaults; `${user_config.KEY}` in
// its arguments and declared variables takes them (a list comma-separated, none as empty).
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
};
const options = spec.options;
const values = options ? { ...options.defaults, ...readJson(options.lock)[options.name]?.options, ...readJson(options.secrets) } : {};
const fill = (text) =>
  text.replace(/\$\{user_config\.([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => {
    const value = values[key];
    return value === undefined ? "" : Array.isArray(value) ? value.join(",") : String(value);
  });
for (const name of declared) if (process.env[name] !== undefined) process.env[name] = fill(process.env[name]);

// The server reads its own arguments from argv: its own, none of the launcher's.
process.argv = [process.argv[0], entry, ...args.map(fill)];
await import(pathToFileURL(entry).href);
