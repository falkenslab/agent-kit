import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { buildCatalog, catalogText, metadataProblems } from "../../packages/agent-kit-catalog/agent-kit-catalog.mjs";

// agent-kit's contract for a marketplace's catalog (#60): the schemas it ships, checked here with
// ajv; the generator (packages/agent-kit-catalog) checks the same rules by hand, with no dependencies.
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const ajv = new Ajv2020({ allErrors: true });
const validMetadata = ajv.compile(read("schemas/agent-kit-metadata.schema.json"));
const validCatalog = ajv.compile(read("schemas/marketplace-catalog.schema.json"));
const generator = path.resolve("packages/agent-kit-catalog/agent-kit-catalog.mjs");
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "agent-kit-catalog-test-"));

test("the kit's own plugins and the captain's jokebook fit agent-kit's metadata schema", () => {
  const plugins = [...fs.readdirSync("extensions").map((name) => `extensions/${name}`), "examples/captain-whiskers/extensions/jokebook"];
  for (const plugin of plugins) {
    const kit = read(path.join(plugin, ".claude-plugin", "plugin.json")).metadata?.["agent-kit"];
    assert.ok(validMetadata(kit), `${plugin}: ${ajv.errorsText(validMetadata.errors)}`);
    assert.deepEqual(metadataProblems(kit), [], plugin);
  }
});

test("the generator's own checks agree with the metadata schema", () => {
  const good = [
    {},
    { kit: ">=0.22.0", provides: ["moodle"], requires: [], help: "Moodle.", catalog: { logo: "assets/logo.svg", banner: "assets/banner.png" } },
    { labels: { list_courses: { en: { label: "Listing courses", phrase: ["listed courses", "listed courses {n} times"] }, es: { label: "Listando" } } } },
    { capabilities: [{ id: "lms-grading", skills: ["grading"], tools: ["grade_submission"], texts: { en: { label: "Grading", description: "With rubrics." }, es: { label: "Corregir" } } }] },
  ];
  const bad = [
    { readonlyTools: ["x"] },
    { kit: "latest" },
    { provides: "moodle" },
    { catalog: { logo: "../logo.svg" } },
    { catalog: { logo: "/abs/logo.svg" } },
    { catalog: { logo: "assets/logo.gif" } },
    { catalog: { icon: "assets/logo.svg" } },
    { labels: { x: { it: { label: "Ciao" } } } },
    { labels: { x: { en: { phrase: ["a", "b"] } } } },
    { labels: { x: { en: { label: "X", phrase: ["only one"] } } } },
    { capabilities: { id: "x" } },
    { capabilities: [{ id: "Grading", texts: { en: { label: "G" } } }] },
    { capabilities: [{ id: "grading" }] },
    { capabilities: [{ id: "grading", texts: {} }] },
    { capabilities: [{ id: "grading", texts: { it: { label: "Voti" } } }] },
    { capabilities: [{ id: "grading", texts: { en: { description: "No label." } } }] },
    { capabilities: [{ id: "grading", tools: "grade", texts: { en: { label: "G" } } }] },
    { capabilities: [{ id: "grading", icon: "x", texts: { en: { label: "G" } } }] },
  ];
  for (const kit of good) {
    assert.ok(validMetadata(kit), `${JSON.stringify(kit)}: ${ajv.errorsText(validMetadata.errors)}`);
    assert.deepEqual(metadataProblems(kit), [], JSON.stringify(kit));
  }
  for (const kit of bad) {
    assert.equal(validMetadata(kit), false, `the schema takes ${JSON.stringify(kit)}`);
    assert.notDeepEqual(metadataProblems(kit), [], `the generator takes ${JSON.stringify(kit)}`);
  }
});

/** A marketplace with two extensions: one with a logo, a banner and topics, one with nothing more than a name. */
function makeMarketplace(): string {
  const root = temp();
  const write = (file: string, content: unknown) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), typeof content === "string" ? content : JSON.stringify(content));
  };
  write(".claude-plugin/marketplace.json", {
    name: "harbor",
    owner: { name: "Ada" },
    metadata: { description: "Ada's extensions." },
    plugins: [
      { name: "notes", source: "./notes", version: "1.0.0" },
      { name: "campus", source: "./campus", version: "0.2.0", description: "Your campus.", category: "Education", tags: ["Moodle", "miyagi"] },
    ],
  });
  const grading = { id: "lms-grading", skills: ["grading"], tools: ["grade_submission"], texts: { en: { label: "Grading", description: "With rubrics." }, es: { label: "Corregir", description: "Con rúbricas." } } };
  write("campus/.claude-plugin/plugin.json", { name: "campus", version: "0.2.0", keywords: ["lms", "moodle"], license: "MIT", metadata: { "agent-kit": { catalog: { logo: "assets/logo.svg", banner: "assets/banner.png" }, capabilities: [grading] } } });
  write("campus/skills/grading/SKILL.md", "---\nname: grading\n---\n");
  write("campus/assets/logo.svg", "<svg/>");
  write("campus/assets/banner.png", "png");
  write("notes/.claude-plugin/plugin.json", { name: "notes", version: "1.0.0", description: "Notes." });
  return root;
}

test("a generated catalog fits agent-kit's catalog schema, the captain's shipyard's too", async () => {
  const catalog = await buildCatalog(makeMarketplace(), { repo: "ada/harbor" });
  assert.ok(validCatalog(catalog), ajv.errorsText(validCatalog.errors));
  assert.deepEqual(
    catalog.extensions.map((extension) => [extension.name, extension.topics]),
    [
      ["campus", ["lms", "moodle", "miyagi", "education"]],
      ["notes", []],
    ],
  );
  assert.equal(catalog.extensions[0]!.logo, "https://raw.githubusercontent.com/ada/harbor/main/campus/assets/logo.svg");
  assert.equal(catalog.extensions[0]!.install.agentKit, "extension add campus@harbor");
  // Its capabilities as it declares them, every language, for the page to choose; none, no key.
  assert.deepEqual(catalog.extensions[0]!.capabilities?.map(({ id, texts }) => [id, Object.keys(texts)]), [["lms-grading", ["en", "es"]]]);
  assert.equal("capabilities" in catalog.extensions[1]!, false);
  const shipyard = await buildCatalog(path.resolve("examples/captain-whiskers/extensions"), { repo: "falkenslab/agent-kit", branch: "main" });
  assert.ok(validCatalog(shipyard), ajv.errorsText(validCatalog.errors));
  assert.equal(shipyard.extensions[0]!.name, "jokebook");
});

test("the generator refuses what doesn't fit, saying every problem at once", async () => {
  const root = makeMarketplace();
  const plugin = path.join(root, "campus", ".claude-plugin", "plugin.json");
  const capabilities = [{ id: "lms-forums", skills: ["forums"], texts: { en: { label: "Forums" } } }];
  fs.writeFileSync(plugin, JSON.stringify({ ...read(plugin), version: "0.3.0", metadata: { "agent-kit": { catalog: { logo: "assets/missing.svg" }, readonlyTools: [], capabilities } } }));
  await assert.rejects(buildCatalog(root, { repo: "ada/harbor" }), (error: Error) => {
    assert.match(error.message, /campus: plugin\.json says 0\.3\.0, marketplace\.json 0\.2\.0/);
    assert.match(error.message, /campus: metadata\["agent-kit"\] has an unknown field, readonlyTools/);
    assert.match(error.message, /campus: its assets\/missing\.svg doesn't exist/);
    assert.match(error.message, /campus: its capability lms-forums names the skill forums, and it has no skills\/forums\/SKILL\.md/);
    return true;
  });
});

test("npx agent-kit-catalog writes catalog.json, and --check fails when it's stale", () => {
  const root = makeMarketplace();
  const run = (...args: string[]) => spawnSync(process.execPath, [generator, root, "--repo", "ada/harbor", ...args], { encoding: "utf8", env: { ...process.env, GITHUB_REPOSITORY: "" } });
  let result = run("--check");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /catalog\.json is out of date/);
  result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /catalog\.json: 2 extensions\./);
  assert.equal(fs.readFileSync(path.join(root, "catalog.json"), "utf8"), catalogText(read(path.join(root, "catalog.json"))));
  assert.equal(run("--check").status, 0);
  // An extension changed without the catalog: stale.
  const manifest = path.join(root, "notes", ".claude-plugin", "plugin.json");
  fs.writeFileSync(manifest, JSON.stringify({ ...read(manifest), keywords: ["writing"] }));
  assert.equal(run("--check").status, 1);
});
