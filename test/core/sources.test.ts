import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { addSource, listSources, loadManifest, pdfPageCount, pptxSlideCount, retireSource } from "../../src/core/sources.js";
import { downloadToFile, htmlToMarkdown } from "../../src/core/tools/saveToSources.js";
import { askForText } from "../../src/core/hooks/humanInput.js";
import { setInteractionPort } from "../../src/core/interaction.js";
import { checkPlanScope } from "../../src/core/hooks/planGate.js";

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

test("originals are new until a summary points to them, then ingested; changed after a change, missing when deleted", async () => {
  const p = await project();
  try {
    await writeFile(path.join(p.sources, "a.txt"), "first version");
    await writeFile(path.join(p.sources, "b.txt"), "other");
    let listing = await listSources(p.sources, p.knowledge, p.root);
    assert.deepEqual(listing.map((s) => [s.path, s.status, s.origin?.kind]), [
      ["a.txt", "new", "manual"],
      ["b.txt", "new", "manual"],
    ]);

    await writeFile(path.join(p.knowledge, "summaries", "a.md"), summary("../../sources/a.txt"));
    listing = await listSources(p.sources, p.knowledge, p.root);
    assert.equal(listing[0].status, "ingested");
    assert.deepEqual(listing[0].summaries, ["knowledge/summaries/a.md"]);

    await writeFile(path.join(p.sources, "a.txt"), "second version, replaced by hand");
    await rm(path.join(p.sources, "b.txt"));
    listing = await listSources(p.sources, p.knowledge, p.root);
    assert.deepEqual(listing.map((s) => [s.path, s.status]), [
      ["a.txt", "changed"],
      ["b.txt", "missing"],
    ]);

    // Without a knowledge folder there's nothing to compare with.
    assert.equal((await listSources(p.sources, undefined, p.root))[0].status, "present");
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

test("retiring moves the original aside and marks its summary: retired if wrong, superseded if replaced", async () => {
  const p = await project();
  try {
    await writeFile(path.join(p.sources, "old.txt"), "old");
    await writeFile(path.join(p.sources, "new.txt"), "new");
    await writeFile(path.join(p.sources, "bad.txt"), "bad");
    await writeFile(path.join(p.knowledge, "summaries", "old.md"), summary("../../sources/old.txt"));
    await writeFile(path.join(p.knowledge, "summaries", "new.md"), summary("../../sources/new.txt"));
    await writeFile(path.join(p.knowledge, "summaries", "bad.md"), summary("[bad](../../sources/bad.txt)"));

    const replaced = await retireSource(p.sources, p.knowledge, p.root, "old.txt", "replaced", "a newer edition", "new.txt");
    assert.match(replaced.movedTo, /^\.agent-kit\/retired\/.+-old\.txt$/);
    assert.equal(await readFile(path.join(p.sources, replaced.movedTo), "utf8"), "old");
    assert.deepEqual(replaced.summaries, [{ page: "knowledge/summaries/old.md", marked: "superseded", supersededBy: "knowledge/summaries/new.md" }]);
    const oldPage = await readFile(path.join(p.knowledge, "summaries", "old.md"), "utf8");
    assert.match(oldPage, /status: superseded\n/);
    assert.match(oldPage, /superseded_by: new\.md\n/);
    assert.match(oldPage, /> Superseded on .*a newer edition.*\[the new summary\]\(new\.md\)/);

    const wrong = await retireSource(p.sources, p.knowledge, p.root, "bad.txt", "wrong", "it was the wrong course");
    assert.deepEqual(wrong.summaries, [{ page: "knowledge/summaries/bad.md", marked: "retired" }]);
    assert.match(await readFile(path.join(p.knowledge, "summaries", "bad.md"), "utf8"), /status: retired\n[\s\S]*> Retired on .*wrong course/);

    const listing = await listSources(p.sources, p.knowledge, p.root);
    assert.deepEqual(listing.map((s) => s.path), ["new.txt"]); // retired ones aren't listed, nor missing
    assert.equal((await loadManifest(p.sources)).retired.length, 2);
    await assert.rejects(retireSource(p.sources, p.knowledge, p.root, "nope.txt", "wrong", "x"), /isn't an original/);
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

test("plan mode lets list_sources through and denies the tools that add or retire", () => {
  const scope = { projectDir: "/project" };
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
    const { createSaveToSourcesServer } = await import("../../src/core/tools/saveToSources.js");
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
