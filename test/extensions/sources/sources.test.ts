import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { addSource, listSources, loadManifest, pdfPageCount, pptxSlideCount, retireSource } from "../../../src/extensions/sources/sources.js";
import { downloadToFile, htmlToMarkdown } from "../../../src/extensions/sources/tools.js";
import { askForText } from "../../../src/core/hooks/humanInput.js";
import { setInteractionPort } from "../../../src/core/interaction.js";
import { checkPlanScope } from "../../../src/core/hooks/planGate.js";
import os from "node:os";
import { sources } from "../../../src/extensions/sources/index.js";
import type { Extension } from "../../../src/core/extensions.js";
import type { BaseSessionConfig } from "../../../src/core/agentSpec.js";

const noSession = () => Promise.reject(new Error("no session in this test"));

/** An extension's contribution, for a minimal session with `config`. */
async function contributionOf(extension: Extension, config: BaseSessionConfig) {
  const spec = { buildSystemPrompt: () => "", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
  return extension.contribute({ config, spec, runDir: os.tmpdir(), mode: config.mode, interactive: true, capabilities: new Set(), session: noSession });
}


afterEach(() => setInteractionPort(null));

async function project() {
  const root = await mkdtemp(path.join(tmpdir(), "agent-kit-sources-"));
  const sources = path.join(root, "sources");
  const knowledge = path.join(root, "knowledge");
  const run = path.join(root, "run");
  await mkdir(path.join(knowledge, "summaries"), { recursive: true });
  await mkdir(sources, { recursive: true });
  await mkdir(run, { recursive: true });
  return { root, sources, knowledge, run, done: () => rm(root, { recursive: true, force: true }) };
}

const summary = (file: string) => `---\ntype: summary\nfile: ${file}\n---\n\n# Summary\n\nWhat it says.\n`;

test("originals are present, with when their content last changed; missing when deleted by hand; and nothing about a knowledge base", async () => {
  const p = await project();
  try {
    await writeFile(path.join(p.sources, "a.txt"), "first version");
    await writeFile(path.join(p.sources, "b.txt"), "other");
    let listing = await listSources(p.sources);
    assert.deepEqual(listing.map((s) => [s.path, s.status, s.origin?.kind]), [
      ["a.txt", "present", "manual"],
      ["b.txt", "present", "manual"],
    ]);
    const first = listing[0].changedAt!;
    assert.ok(Date.now() - Date.parse(first) < 60_000);
    assert.ok(!("summaries" in listing[0]));

    // Touched with the same content: changedAt stays. Changed: it moves.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await writeFile(path.join(p.sources, "a.txt"), "first version");
    assert.equal((await listSources(p.sources))[0].changedAt, first);
    await writeFile(path.join(p.sources, "a.txt"), "second version, replaced by hand");
    await rm(path.join(p.sources, "b.txt"));
    listing = await listSources(p.sources);
    assert.ok(Date.parse(listing[0].changedAt!) > Date.parse(first));
    assert.deepEqual(listing.map((s) => [s.path, s.status]), [
      ["a.txt", "present"],
      ["b.txt", "missing"],
    ]);
    // The manifest knows nothing of ingests.
    assert.ok(!("ingestedHash" in (await loadManifest(p.sources)).files["a.txt"]));
  } finally {
    await p.done();
  }
});

test("adding never overwrites, keeps one copy of identical files, records provenance and versions", async () => {
  const p = await project();
  try {
    const file = path.join(p.run, "slides.pdf");
    await writeFile(file, "%PDF slides v1");
    assert.deepEqual(await addSource(p.sources, file, "topic-3/slides.pdf", { kind: "url", from: "https://example.com/s.pdf" }), { path: "topic-3/slides.pdf" });
    assert.deepEqual(await addSource(p.sources, file, "elsewhere/copy.pdf", { kind: "run", from: "slides.pdf" }), {
      path: "topic-3/slides.pdf",
      duplicateOf: "topic-3/slides.pdf",
    });

    const v2 = path.join(p.run, "slides-v2.pdf");
    await writeFile(v2, "%PDF slides v2");
    await assert.rejects(addSource(p.sources, v2, "topic-3/slides.pdf", { kind: "run", from: "slides-v2.pdf" }), /never overwritten/);
    await addSource(p.sources, v2, "topic-3/slides-v2.pdf", { kind: "run", from: "slides-v2.pdf" }, { replaces: "topic-3/slides.pdf" });
    assert.equal(await readFile(path.join(p.sources, "topic-3", "slides.pdf"), "utf8"), "%PDF slides v1");

    const manifest = await loadManifest(p.sources);
    assert.deepEqual(manifest.files["topic-3/slides.pdf"].origin, { kind: "url", from: "https://example.com/s.pdf" });
    assert.equal(manifest.files["topic-3/slides-v2.pdf"].replaces, "topic-3/slides.pdf");
    await assert.rejects(addSource(p.sources, v2, "../outside.pdf", { kind: "run", from: "x" }), /inside sources/);
    await assert.rejects(addSource(p.sources, v2, ".agent-kit/x.pdf", { kind: "run", from: "x" }), /inside sources/);
  } finally {
    await p.done();
  }
});

test("retiring moves the original aside, lists it as retired with why and what replaced it, and touches no knowledge base", async () => {
  const p = await project();
  try {
    await writeFile(path.join(p.sources, "old.txt"), "old");
    await writeFile(path.join(p.sources, "new.txt"), "new");
    await writeFile(path.join(p.sources, "bad.txt"), "bad");
    await writeFile(path.join(p.knowledge, "summaries", "old.md"), summary("old.txt"));
    const before = await readFile(path.join(p.knowledge, "summaries", "old.md"), "utf8");

    const replaced = await retireSource(p.sources, "old.txt", "replaced", "a newer edition", "new.txt");
    assert.match(replaced.movedTo, /^\.agent-kit\/retired\/.+-old\.txt$/);
    assert.equal(await readFile(path.join(p.sources, replaced.movedTo), "utf8"), "old");
    await retireSource(p.sources, "bad.txt", "wrong", "it was the wrong course");
    // The summaries are the knowledge base's: the model updates them with its tools.
    assert.equal(await readFile(path.join(p.knowledge, "summaries", "old.md"), "utf8"), before);

    const listing = await listSources(p.sources);
    assert.deepEqual(
      listing.map((s) => [s.path, s.status, s.why, s.replacedBy]),
      [
        ["new.txt", "present", undefined, undefined],
        ["old.txt", "retired", "replaced", "new.txt"],
        ["bad.txt", "retired", "wrong", undefined],
      ],
    );
    assert.ok(listing[1].retiredAt);
    await assert.rejects(retireSource(p.sources, "nope.txt", "wrong", "x"), /isn't an original/);
  } finally {
    await p.done();
  }
});

test("pages of a PDF and slides of a PPTX, without parsing them", () => {
  assert.equal(pdfPageCount(Buffer.from("1 0 obj << /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >> endobj", "latin1")), 3);
  assert.equal(pdfPageCount(Buffer.from("<< /Type /Page >> << /Type /Page >>", "latin1")), 2);
  assert.equal(pdfPageCount(Buffer.from("no pages here", "latin1")), undefined);
  assert.equal(pptxSlideCount(Buffer.from("PK..ppt/slides/slide1.xml..ppt/slides/slide2.xml..ppt/slides/slide1.xml", "latin1")), 2);
});

test("a web page's main content becomes markdown", async () => {
  const html = `<html><head><title>Knots</title></head><body><nav>Menu Home About</nav><article><h1>Knots</h1><p>A bowline makes a fixed loop at the end of a line. It is one of the most useful knots a sailor can learn, and it doesn't slip.</p><p>A clove hitch ties a line to a post quickly, and it is easy to adjust before it takes the load.</p></article><footer>© 2026</footer></body></html>`;
  const markdown = await htmlToMarkdown(html, "https://example.com/knots");
  assert.ok(markdown);
  assert.match(markdown, /^# Knots\n\nSource: https:\/\/example\.com\/knots/);
  assert.match(markdown, /A bowline makes a fixed loop/);
  assert.doesNotMatch(markdown, /Menu Home About/);
});

test("downloads keep to http(s) and the size limit", async () => {
  const p = await project();
  const server = createServer((req, res) => {
    res.setHeader("content-type", req.url === "/page" ? "text/html" : "application/pdf");
    res.end(req.url === "/big" ? Buffer.alloc(2048) : "%PDF tiny");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  try {
    const file = path.join(p.run, "d.pdf");
    assert.equal(await downloadToFile(`http://127.0.0.1:${port}/doc`, file, 1024), "application/pdf");
    assert.equal(await readFile(file, "utf8"), "%PDF tiny");
    await assert.rejects(downloadToFile(`http://127.0.0.1:${port}/big`, file, 1024), /limit/);
    await assert.rejects(downloadToFile("file:///etc/passwd", file, 1024), /Only http and https/);
    await assert.rejects(downloadToFile("not a url", file, 1024), /isn't a URL/);
  } finally {
    server.close();
    await p.done();
  }
});

test("a text answer keeps its case, through askText or askDecision", async () => {
  const p = await project();
  try {
    setInteractionPort({ askDecision: async () => "y", askManualIntervention: async () => "", askText: async () => "  C:\\Docs\\Syllabus.PDF  ", notify: () => {} });
    assert.equal(await askForText(p.run, { title: "t", lines: [] }), "C:\\Docs\\Syllabus.PDF");
    setInteractionPort({ askDecision: async () => "/Home/Me/Notes.md", askManualIntervention: async () => "", notify: () => {} });
    assert.equal(await askForText(p.run, { title: "t", lines: [] }), "/Home/Me/Notes.md");
  } finally {
    await p.done();
  }
});

test("plan mode lets list_sources and extract_text through, as the sources extension declares, and denies the tools that add or retire", async () => {
  const { readOnlyTools } = await contributionOf(sources({ dir: path.resolve("/project/sources") }), { mode: "guided", projectDir: path.resolve("/project") });
  const scope = { projectDir: "/project", readOnlyTools };
  assert.equal(checkPlanScope(scope, "mcp__sourceFiles__extract_text", {}), undefined);
  assert.equal(checkPlanScope(scope, "mcp__sourceFiles__list_sources", {}), undefined);
  for (const tool of ["save_to_sources", "download_to_sources", "request_file", "retire_source"]) {
    assert.match(checkPlanScope(scope, `mcp__sourceFiles__${tool}`, {}) ?? "", /Plan mode/, tool);
  }
});

test("parallel additions don't lose each other's manifest entries", async () => {
  const p = await project();
  try {
    const files = await Promise.all(
      Array.from({ length: 8 }, async (_, i) => {
        const file = path.join(p.run, `f${i}.txt`);
        await writeFile(file, `content ${i}`);
        return file;
      }),
    );
    await Promise.all(files.map((file, i) => addSource(p.sources, file, `f${i}.txt`, { kind: "run", from: `f${i}.txt` })));
    assert.equal(Object.keys((await loadManifest(p.sources)).files).length, 8);
  } finally {
    await p.done();
  }
});

test("a folder as destination keeps the file's own name inside it (found by a real session)", async () => {
  const p = await project();
  try {
    const file = path.join(p.run, "jokes-book.md");
    await writeFile(file, "# Jokes");
    assert.deepEqual(await addSource(p.sources, file, "books/", { kind: "person", from: "jokes-book.md" }), { path: "books/jokes-book.md" });
    const other = path.join(p.run, "tmp-123");
    await writeFile(other, "# More jokes");
    // An existing folder without the slash, and a name given apart (a download's, from its URL).
    assert.deepEqual(await addSource(p.sources, other, "books", { kind: "url", from: "https://x/y/more.md" }, { name: "more.md" }), { path: "books/more.md" });
  } finally {
    await p.done();
  }
});

test("the sources tools name the folder as it really is, and take paths with either name (found by a real session)", async () => {
  const p = await project();
  try {
    const treasure = path.join(p.root, "treasure");
    await mkdir(treasure, { recursive: true });
    const { createSaveToSourcesServer } = await import("../../../src/extensions/sources/tools.js");
    const server = createSaveToSourcesServer(p.run, treasure, undefined, { projectDir: p.root, interactive: true }) as unknown as {
      instance: { _registeredTools: Record<string, { description: string; handler: (args: unknown, extra: unknown) => Promise<{ content: { text: string }[] }> }> };
    };
    const tools = server.instance._registeredTools;
    assert.match(tools.list_sources.description, /List the originals in treasure\//);
    assert.doesNotMatch(tools.save_to_sources.description, /sources\//);
    await writeFile(path.join(p.run, "map.txt"), "X marks the spot");
    const saved = await tools.save_to_sources.handler({ source: "map.txt", destination: "treasure/maps/map.txt" }, {});
    assert.equal(saved.content[0].text, "Saved to treasure/maps/map.txt.");
    assert.equal(await readFile(path.join(treasure, "maps", "map.txt"), "utf8"), "X marks the spot");
  } finally {
    await p.done();
  }
});

test("the host adds a file the person gave through the extension's api: the person as its origin, a duplicate recognized, never overwriting", async () => {
  const p = await project();
  try {
    const { api } = await contributionOf(sources({ dir: p.sources }), { mode: "guided", projectDir: p.root });
    const addSource = api?.addSource as (file: string, name: string, subfolder?: string) => Promise<{ path: string; duplicateOf?: string }>;
    const upload = path.join(p.run, "upload.tmp");
    await writeFile(upload, "Why do pirates make great singers? They hit the high Cs.\n");
    assert.deepEqual(await addSource(upload, "jokes.md"), { path: "jokes.md" });
    assert.equal((await loadManifest(p.sources)).files["jokes.md"]?.origin.kind, "person");
    assert.deepEqual(await addSource(upload, "again.md"), { path: "jokes.md", duplicateOf: "jokes.md" });
    await writeFile(upload, "Another one.\n");
    await assert.rejects(addSource(upload, "jokes.md"), /never overwritten/);
    assert.deepEqual(await addSource(upload, "more.md", "books"), { path: "books/more.md" });
  } finally {
    await p.done();
  }
});
