import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFileKnowledgeStore } from "../../../src/extensions/knowledge/fileKnowledgeStore.js";
import { checkFileScope } from "../../../src/core/hooks/fileScopeGate.js";
import { checkPlanScope } from "../../../src/core/hooks/planGate.js";
import type { PageType } from "../../../src/extensions/knowledge/knowledgeStore.js";
import os from "node:os";
import { knowledge } from "../../../src/extensions/knowledge/index.js";
import type { Extension } from "../../../src/core/extensions.js";
import type { BaseSessionConfig } from "../../../src/core/agentSpec.js";

const noSession = () => Promise.reject(new Error("no session in this test"));

/** An extension's contribution, for a minimal session with `config`. */
async function contributionOf(extension: Extension, config: BaseSessionConfig) {
  const spec = { buildSystemPrompt: () => "", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
  return extension.contribute({ config, spec, runDir: os.tmpdir(), mode: config.mode, interactive: true, capabilities: new Set(), session: noSession });
}


/** An existing knowledge base, written the way the file tools always did. */
async function existing() {
  const root = await mkdtemp(path.join(tmpdir(), "agent-kit-kb-"));
  const k = path.join(root, "knowledge");
  const s = path.join(root, "sources");
  await mkdir(path.join(k, "concepts"), { recursive: true });
  await mkdir(path.join(k, "summaries"), { recursive: true });
  await mkdir(s, { recursive: true });
  await writeFile(path.join(s, "tides.pdf"), "%PDF tides");
  await writeFile(
    path.join(k, "summaries", "tides-chapter.md"),
    "---\ntype: summary\ntitle: Tides chapter\nfile: ../../sources/tides.pdf\n---\n\n# Tides chapter\n\nA chapter on tides.\n\n## Pages it feeds\n\n- [Tides](../concepts/tides.md)\n",
  );
  await writeFile(path.join(k, "concepts", "tides.md"), "---\ntype: concept\naliases: tidal movement\n---\n\n# Tides\n\nThe rise and fall of the sea.\n\n## Sources\n\n- [Tides chapter](../summaries/tides-chapter.md)\n");
  await writeFile(path.join(k, "concepts", "lonely.md"), "---\ntype: concept\n---\n\n# Lonely\n\nNothing links here. See [ghost](ghost.md).\n");
  await writeFile(path.join(k, "index.md"), "# Index\n\n(stale)\n");
  return { root, k, s, done: () => rm(root, { recursive: true, force: true }) };
}

test("an existing knowledge base reads as pages: links as ids, titles, fields, what links to each page", async () => {
  const kb = await existing();
  try {
    const store = createFileKnowledgeStore(kb.k);
    const tides = await store.read("concept/tides");
    assert.equal(tides?.title, "Tides");
    assert.equal(tides?.fields.aliases, "tidal movement");
    assert.match(tides!.content, /\[Tides chapter\]\(summary\/tides-chapter\)/);
    assert.deepEqual(tides?.linkedFrom, ["summary/tides-chapter"]);
    assert.equal(await store.read("concept/nope"), null);
    assert.deepEqual((await store.list()).map((p) => p.id), ["summary/tides-chapter", "concept/lonely", "concept/tides"]);
    assert.equal((await store.list()).find((p) => p.id === "concept/tides")?.description, "The rise and fall of the sea.");
  } finally {
    await kb.done();
  }
});

test("creating pages: links must exist, slugs are checked, files get relative links, and the index is rewritten", async () => {
  const kb = await existing();
  try {
    const store = createFileKnowledgeStore(kb.k);
    await assert.rejects(store.create("concept", "Spring Tides", "Spring tides", "x"), /valid slug/);
    await assert.rejects(store.create("concept", "tides", "Tides", "x"), /already exists/);
    await assert.rejects(store.create("concept", "spring-tides", "Spring tides", "See [neap](concept/neap-tides)."), /don't exist: concept\/neap-tides/);
    await assert.rejects(store.create("recipe", "x", "X", "x"), /isn't a page type/);

    assert.equal(await store.create("concept", "spring-tides", "Spring tides", "The biggest range. See [Tides](concept/tides).", { aliases: "king tides" }), "concept/spring-tides");
    const file = await readFile(path.join(kb.k, "concepts", "spring-tides.md"), "utf8");
    assert.match(file, /^---\ntype: concept\ntitle: Spring tides\naliases: king tides\nupdated: \d{4}-\d{2}-\d{2}\n---\n\n# Spring tides\n\nThe biggest range\. See \[Tides\]\(tides\.md\)\./);
    assert.deepEqual((await store.read("concept/tides"))?.linkedFrom.sort(), ["concept/spring-tides", "summary/tides-chapter"]);
    const index = await readFile(path.join(kb.k, "index.md"), "utf8");
    assert.match(index, /## Summaries\n\n- \[Tides chapter\]\(summaries\/tides-chapter\.md\) — A chapter on tides\./);
    assert.match(index, /- \[Spring tides\]\(concepts\/spring-tides\.md\) — The biggest range\./);

    // A summary's original is kept as given (relative to the sources folder, unchecked: the
    // sources are another extension's data, #30); when it was written is the store's, never the caller's.
    await store.create("summary", "tides-again", "Tides again", "Same.", { file: "tides.pdf", ingested: "1999-01-01T00:00:00.000Z" });
    const summary = await readFile(path.join(kb.k, "summaries", "tides-again.md"), "utf8");
    assert.match(summary, /\nfile: tides\.pdf\n/);
    const ingested = /\ningested: "?(\d{4}-\d{2}-\d{2}T[\d:.]+Z)"?\n/.exec(summary)?.[1];
    assert.ok(ingested && Date.now() - Date.parse(ingested) < 60_000, summary);
    // The index line shows both, so one knowledge_index and one list_sources give the model what to compare.
    assert.match(await readFile(path.join(kb.k, "index.md"), "utf8"), /- \[Tides again\]\(summaries\/tides-again\.md\) — Same\. \(file: tides\.pdf, ingested: \d{4}-\d{2}-\d{2}T/);

    // Rewriting a summary is redoing it from its original: ingested moves; editing a fragment doesn't.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await store.edit("summary/tides-again", "Same.", "Same, again.");
    assert.ok((await readFile(path.join(kb.k, "summaries", "tides-again.md"), "utf8")).includes(ingested));
    await store.rewrite("summary/tides-again", "Redone.");
    assert.ok(!(await readFile(path.join(kb.k, "summaries", "tides-again.md"), "utf8")).includes(ingested));
  } finally {
    await kb.done();
  }
});

test("editing by fragment, rewriting, superseding and retiring", async () => {
  const kb = await existing();
  try {
    const store = createFileKnowledgeStore(kb.k);
    await assert.rejects(store.edit("concept/tides", "not there", "x"), /isn't in/);
    await store.create("concept", "rise", "Rise", "Up. Up.");
    await assert.rejects(store.edit("concept/rise", "Up", "x"), /appears 2 times/);
    await store.edit("concept/tides", "The rise and fall of the sea.", "The rise and fall of the sea, see [Rise](concept/rise).");
    assert.match((await store.read("concept/tides"))!.content, /see \[Rise\]\(concept\/rise\)/);
    assert.deepEqual((await store.read("concept/rise"))?.linkedFrom, ["concept/tides"]);

    await store.rewrite("concept/lonely", "Now it has a definition.");
    assert.match((await store.read("concept/lonely"))!.content, /^# Lonely\n\nNow it has a definition\./);

    await store.supersede("concept/rise", "concept/tides", "merged");
    const rise = await store.read("concept/rise");
    assert.equal(rise?.fields.status, "superseded");
    assert.match(rise!.content, /^> Superseded on .* \(merged\): see \[Tides\]\(concept\/tides\)\./);
    assert.match(await store.index(), /Rise.*\(superseded\)/);

    await store.retire("concept/lonely", "it was made up");
    assert.equal((await store.read("concept/lonely"))?.fields.status, "retired");
    assert.ok(!(await store.list()).some((p) => p.id === "concept/lonely"));
    assert.doesNotMatch(await store.index(), /Lonely/);
    assert.deepEqual(await store.search("definition"), []);
  } finally {
    await kb.done();
  }
});

test("search, check, the overview and the log", async () => {
  const kb = await existing();
  try {
    const store = createFileKnowledgeStore(kb.k);
    const hits = await store.search("tidal");
    assert.equal(hits[0].id, "concept/tides"); // by alias
    assert.match((await store.search("sea"))[0].snippet, /rise and fall of the sea/);

    const report = await store.check();
    assert.deepEqual(report.brokenLinks, [{ page: "concept/lonely", target: "concepts/ghost.md" }]);
    assert.deepEqual(report.orphans, ["concept/lonely"]);
    // Whether an original is still there is the sources' data, not the knowledge base's (#30).
    assert.deepEqual(Object.keys(report).sort(), ["brokenLinks", "linksToRetired", "orphans"]);
    assert.doesNotMatch(await readFile(path.join(kb.k, "index.md"), "utf8"), /stale/); // check rewrites the index

    assert.equal(await store.overview(), "");
    await store.writeOverview("Tides first: [Tides](concept/tides).");
    assert.equal(await readFile(path.join(kb.k, "overview.md"), "utf8"), "Tides first: [Tides](concepts/tides.md).\n");
    assert.equal(await store.overview(), "Tides first: [Tides](concept/tides).\n");

    await store.log("ingest", "Tides chapter", ["summary/tides-chapter"]);
    await store.log("lint", "fixed a link");
    assert.match(await readFile(path.join(kb.k, "log.md"), "utf8"), /^# Log\n\n## \[\d{4}-\d{2}-\d{2}\] ingest \| Tides chapter\n- pages: summary\/tides-chapter\n\n## \[\d{4}-\d{2}-\d{2}\] lint \| fixed a link\n$/);
  } finally {
    await kb.done();
  }
});

test("declared page types: at the root, with their index section and fields", async () => {
  const kb = await existing();
  try {
    const topic: PageType = { type: "topic", dir: "", indexSection: "Topics", description: "A course topic.", template: "## Goals", indexFields: ["mastery"] };
    const store = createFileKnowledgeStore(kb.k, { pageTypes: [topic] });
    await assert.rejects(store.create("topic", "index", "Index", "x"), /reserved/);
    await store.create("topic", "knots", "Knots", "Tie a [bowline](topic/knots).", { mastery: "2" });
    assert.ok(await readFile(path.join(kb.k, "knots.md"), "utf8"));
    // The tools get the catalog by id, as everything the model reads (found by a real session:
    // with file paths it called knowledge_read("summaries/kitchen.md")); index.md keeps file links.
    assert.match(await store.index(), /## Topics\n\n- \[Knots\]\(topic\/knots\) — Tie a bowline\. \(mastery: 2\)/);
    assert.match(await readFile(path.join(kb.k, "index.md"), "utf8"), /## Topics\n\n- \[Knots\]\(knots\.md\) — Tie a bowline\. \(mastery: 2\)/);
    assert.equal((await store.read("topic/knots"))?.title, "Knots");
    // A markdown file at the root of another type isn't a topic.
    await writeFile(path.join(kb.k, "notes.md"), "---\ntype: other\n---\n\n# Notes\n");
    assert.equal(await store.read("topic/notes"), null);
  } finally {
    await kb.done();
  }
});

test("the knowledge folder is out of the file tools' reach, with a pointer to the knowledge tools", () => {
  const scope = {
    projectDir: "/p",
    writableDirs: [],
    searchableDirs: ["/p/sources"],
    deniedPaths: [],
    toolOnlyDirs: [{ dir: "/p/knowledge", instead: "the knowledge_* tools" }],
  };
  for (const [tool, input] of [
    ["Read", { file_path: "knowledge/index.md" }],
    ["Write", { file_path: "/p/knowledge/concepts/x.md" }],
    ["Grep", { path: "knowledge", pattern: "x" }],
    ["Glob", { path: "/p/knowledge", pattern: "**/*.md" }],
    ["Glob", { pattern: "knowledge/**/*.md" }],
  ] as const) {
    assert.match(checkFileScope(scope, tool, input) ?? "", /reached only through the knowledge_\* tools/, `${tool} ${JSON.stringify(input)}`);
  }
  assert.equal(checkFileScope(scope, "Read", { file_path: "sources/a.pdf" }), undefined);
});

test("plan mode lets the knowledge base's reading tools through, as its extension declares, and not its writing ones", async () => {
  const kb = await existing();
  try {
    const { readOnlyTools } = await contributionOf(knowledge({ dir: kb.k }), { mode: "guided", projectDir: kb.root });
    const plan = { projectDir: "/p", readOnlyTools };
    assert.equal(checkPlanScope(plan, "mcp__knowledge__knowledge_search", {}), undefined);
    assert.match(checkPlanScope(plan, "mcp__knowledge__knowledge_create", {}) ?? "", /Plan mode/);
  } finally {
    await kb.done();
  }
});

test("a search from above the knowledge folder is refused, one that starts elsewhere isn't", () => {
  const scope = { projectDir: "/p", writableDirs: [], searchableDirs: ["/p/sources"], deniedPaths: [], toolOnlyDirs: [{ dir: "/p/knowledge", instead: "the knowledge_* tools" }] };
  assert.match(checkFileScope(scope, "Glob", { pattern: "*" }) ?? "", /knowledge_\*/);
  assert.match(checkFileScope(scope, "Glob", { pattern: "**/*.md" }) ?? "", /knowledge_\*/);
  assert.equal(checkFileScope(scope, "Glob", { pattern: "sources/**/*.pdf" }), undefined);
  assert.equal(checkFileScope(scope, "Glob", { path: "sources", pattern: "*.pdf" }), undefined);
});

test("several pages at once may link to each other; if one is wrong, none is written", async () => {
  const kb = await existing();
  try {
    const store = createFileKnowledgeStore(kb.k);
    await assert.rejects(
      store.createMany([
        { type: "concept", slug: "wind", title: "Wind", content: "See [Gust](concept/gust)." },
        { type: "concept", slug: "gust", title: "Gust", content: "See [Wind](concept/wind) and [Nope](concept/nope)." },
      ]),
      /concept\/nope/,
    );
    assert.equal(await store.read("concept/wind"), null);

    assert.deepEqual(
      await store.createMany([
        { type: "summary", slug: "weather", title: "Weather", content: "Feeds [Wind](concept/wind) and [Gust](concept/gust).", fields: { file: "tides.pdf" } },
        { type: "concept", slug: "wind", title: "Wind", content: "See [Gust](concept/gust). Source: [Weather](summary/weather)." },
        { type: "concept", slug: "gust", title: "Gust", content: "See [Wind](concept/wind)." },
      ]),
      ["summary/weather", "concept/wind", "concept/gust"],
    );
    assert.deepEqual((await store.read("concept/wind"))?.linkedFrom.sort(), ["concept/gust", "summary/weather"]);
  } finally {
    await kb.done();
  }
});

test("links to the overview, the index or the log aren't broken when the file exists (#22)", async () => {
  const kb = await existing();
  try {
    await writeFile(path.join(kb.k, "overview.md"), "# Overview\n");
    await writeFile(path.join(kb.k, "concepts", "links.md"), "---\ntype: concept\n---\n\n# Links\n\nSee [the overview](../overview.md), [the index](../index.md) and [the log](../log.md). See [Tides](tides.md).\n");
    const store = createFileKnowledgeStore(kb.k);
    const broken = (await store.check()).brokenLinks.filter((link) => link.page === "concept/links");
    assert.deepEqual(broken, [{ page: "concept/links", target: "log.md" }]); // no log.md yet
    await store.log("update", "first entry");
    assert.deepEqual((await store.check()).brokenLinks.filter((link) => link.page === "concept/links"), []);
  } finally {
    await kb.done();
  }
});

test("the latest log entries, newest first (#23)", async () => {
  const kb = await existing();
  try {
    const store = createFileKnowledgeStore(kb.k);
    assert.deepEqual(await store.recentLog!(), []);
    await store.log("ingest", "Tides chapter", ["summary/tides-chapter"]);
    await store.log("lint", "fixed a link");
    await store.log("query", "best tides");
    const entries = await store.recentLog!(2);
    assert.equal(entries.length, 2);
    assert.match(entries[0], /^## \[\d{4}-\d{2}-\d{2}\] query \| best tides$/);
    assert.match(entries[1], /lint \| fixed a link/);
    assert.match((await store.recentLog!())[2], /ingest \| Tides chapter\n- pages: summary\/tides-chapter/);
  } finally {
    await kb.done();
  }
});
