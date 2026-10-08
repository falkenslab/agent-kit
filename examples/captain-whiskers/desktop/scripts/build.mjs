// Prepares the desktop app (`npm run build`): the kit packed as it would be published, and the
// captain compiled to JavaScript with everything he reads next to him (his plugin, his guide,
// the chest's samples, his web page, his jokebook to install on the first start). Run it again
// after changing the captain or the kit.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const captainDir = path.resolve(desktop, "..");
const kit = path.resolve(captainDir, "..", "..");
// One command line through the shell (npm and npx are .cmd files on Windows), paths quoted.
const run = (command, cwd) => execSync(command, { cwd, stdio: "inherit" });

// The kit, as published: a `file:` link would bring its development dependencies along.
const packed = execSync(`npm pack "${kit}" --pack-destination "${desktop}" --silent`, { cwd: desktop, encoding: "utf8" }).trim().split(/\r?\n/).at(-1);
rmSync(path.join(desktop, "agent-kit.tgz"), { force: true });
renameSync(path.join(desktop, packed), path.join(desktop, "agent-kit.tgz"));
console.log(`kit: ${packed} → agent-kit.tgz`);
// Installed again every time: the tarball keeps the kit's version, so a plain `npm install`
// would keep the kit it installed before, and the app would ship it.
rmSync(path.join(desktop, "node_modules", "@falkenslab"), { recursive: true, force: true });
run(`npm install --no-save "@falkenslab/agent-kit@file:./agent-kit.tgz"`, desktop);

// The app's version is the captain's (his package.json, the one he says he is): written here,
// so the installer can't say another.
const { version } = JSON.parse(readFileSync(path.join(captainDir, "package.json"), "utf8"));
const manifest = path.join(desktop, "package.json");
writeFileSync(manifest, readFileSync(manifest, "utf8").replace(/("version":\s*")[^"]*(")/, `$1${version}$2`));
console.log(`version: ${version}`);

// The captain, compiled.
const out = path.join(desktop, "captain");
rmSync(out, { recursive: true, force: true });
run("npx tsc -p tsconfig.desktop.json", captainDir);

// What he reads, next to his code.
for (const item of ["package.json", "guide.md", "plugin", "treasure-samples", path.join("web", "index.html"), "extensions"]) {
  const from = path.join(captainDir, item);
  if (!existsSync(from)) throw new Error(`missing ${from}`);
  mkdirSync(path.dirname(path.join(out, item)), { recursive: true });
  cpSync(from, path.join(out, item), { recursive: true });
}
console.log(`captain: compiled into ${path.relative(desktop, out)}/`);
