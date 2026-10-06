import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { extractText } from "../../../src/extensions/sources/extractText.js";

const zip = (files: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])));

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const DOCX = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body><w:p><w:r><w:t>The secret word is BARNACLE-42.</w:t></w:r></w:p><w:p><w:r><w:t>Tides &amp; currents.</w:t></w:r></w:p></w:body></w:document>`,
};

const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const slide = (title: string, body: string) =>
  `<p:sld ${A}><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:txBody><a:p><a:r><a:t>${body}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
const PPTX = {
  "ppt/slides/slide1.xml": slide("Knots", "A bowline makes a fixed loop."),
  "ppt/slides/slide2.xml": slide("Sails", "The jib sits forward of the mast."),
  "ppt/slides/slide3.xml": slide("Tides", "Spring tides follow the full moon."),
  "ppt/slides/_rels/slide1.xml.rels": `<Relationships><Relationship Id="rId2" Target="../notesSlides/notesSlide1.xml"/></Relationships>`,
  "ppt/notesSlides/notesSlide1.xml": `<p:notes ${A}><a:p><a:r><a:t>The secret word is SEAGULL-7.</a:t></a:r></a:p><a:p><a:r><a:t>1</a:t></a:r></a:p></p:notes>`,
};

const XLSX = {
  "xl/workbook.xml": `<workbook><sheets><sheet name="Marks" sheetId="1"/></sheets></workbook>`,
  "xl/sharedStrings.xml": `<sst><si><t>Name</t></si><si><t>Mark</t></si><si><t>Ana</t></si></sst>`,
  "xl/worksheets/sheet1.xml": `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>9.5</v></c></row><row r="3"><c r="B3" t="inlineStr"><is><t>absent</t></is></c></row></sheetData></worksheet>`,
};

test("a DOCX, a PPTX with speaker notes and an XLSX come out as markdown", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "agent-kit-extract-"));
  try {
    await writeFile(path.join(dir, "tides.docx"), zip(DOCX));
    await writeFile(path.join(dir, "sailing.pptx"), zip(PPTX));
    await writeFile(path.join(dir, "marks.xlsx"), zip(XLSX));

    const doc = await extractText(path.join(dir, "tides.docx"));
    assert.match(doc, /^# tides\.docx/);
    assert.match(doc, /BARNACLE-42/);
    assert.match(doc, /Tides & currents/);

    const deck = await extractText(path.join(dir, "sailing.pptx"));
    assert.match(deck, /3 slides\./);
    assert.match(deck, /## Slide 1: Knots\n\n- A bowline makes a fixed loop\.\n\nSpeaker notes:\n> The secret word is SEAGULL-7\./);
    assert.doesNotMatch(deck, /> 1$/m); // the slide-number placeholder
    const part = await extractText(path.join(dir, "sailing.pptx"), 2, 2);
    assert.match(part, /slides 2 to 2/);
    assert.match(part, /## Slide 2: Sails/);
    assert.doesNotMatch(part, /Knots|Tides/);

    const book = await extractText(path.join(dir, "marks.xlsx"));
    assert.match(book, /## Marks\n\n\| Name \| Mark \|\n\| --- \| --- \|\n\| Ana \| 9\.5 \|\n\| {2}\| absent \|/);

    await assert.rejects(extractText(path.join(dir, "notes.pdf")), /use Read/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

