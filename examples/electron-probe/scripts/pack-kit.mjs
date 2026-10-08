// Packs the kit as it would be published (`npm pack`) into agent-kit.tgz, which package.json
// depends on: a `file:` dependency on the repository would install a link, with the kit's
// development dependencies, and package far more than an agent ships.
import { execSync } from "node:child_process";
import { renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kit = path.resolve(here, "..", "..");
// One command line through the shell (npm is a .cmd file on Windows), paths quoted.
const output = execSync(`npm pack "${kit}" --pack-destination "${here}" --silent`, { cwd: here, encoding: "utf8" });
const file = output.trim().split(/\r?\n/).at(-1);
rmSync(path.join(here, "agent-kit.tgz"), { force: true });
renameSync(path.join(here, file), path.join(here, "agent-kit.tgz"));
console.log(`Packed ${file} as agent-kit.tgz`);
