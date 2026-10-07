// The probe's patch (ADR-026, #41): the installed kit hands the Claude Code CLI the knowledge
// extension's plugin path inside app.asar, which another process can't read, so its skills
// silently disappear in the packaged app. This rewrites that one path to app.asar.unpacked,
// which the build unpacks (`asarUnpack`). The kit will do it itself, for every path it hands
// to another process; until then, run this after `npm install` and before `npm run dist`.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(here, "node_modules", "@falkenslab", "agent-kit", "dist", "extensions", "knowledge", "prompt.js");
const original = `return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "extensions", "knowledge");`;
const patched = String.raw`return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "extensions", "knowledge").replace(/([\\/])app\.asar([\\/])/, "$1app.asar.unpacked$2");`;

const source = readFileSync(file, "utf8");
if (source.includes(patched)) {
  console.log("Already patched.");
} else if (source.includes(original)) {
  writeFileSync(file, source.replace(original, patched));
  console.log(`Patched ${path.relative(here, file)}`);
} else {
  console.error(`The knowledge plugin's path isn't where this patch expects it in ${file}: the kit changed.`);
  process.exit(1);
}
