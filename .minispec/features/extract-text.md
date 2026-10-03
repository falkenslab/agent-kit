# Text from DOCX, PPTX and XLSX originals

Issue: [#19](https://github.com/falkenslab/agent-kit/issues/19)

## Goal

The agent reads Word, PowerPoint and Excel originals in `sourcesDir` as markdown, through an `extract_text` tool of the kit.

## Context

- Confirmed empirically (#14): the SDK's `Read` reads PDFs and images but refuses DOCX and PPTX ("This tool cannot read binary files"). Course material is often slides and Word documents; today the agent can only ask the person for a PDF.
- `list_sources` already reports the type, and the slides of a PPTX.

## Changes

- `extract_text(source, from?, to?)` in the `sourceFiles` server, read-only (allowed in plan mode): an original in `sourcesDir` to markdown.
  - DOCX: headings, paragraphs, lists and tables.
  - PPTX: a section per slide (its title and text), with the speaker notes, which often carry the explanation; `from`/`to` pick slides.
  - XLSX: a table per sheet, capped in rows (with the count of the rest).
  - Images in them are left out, counted.
- Optional peer dependencies (as the HTML to markdown ones): without them the tool says what to install, and isn't offered if none is there. Choose libraries that are pure JavaScript (e.g. mammoth for DOCX; a zip reader and the XML for PPTX/XLSX).
- The tools' and the skills' descriptions: use `extract_text` for those formats instead of asking for a PDF.
- Labels and phrases in the four languages.
- Docs: the knowledge base guide (sources), tool labels.

## Acceptance

- A DOCX, a PPTX (with notes) and an XLSX made in a test come out as markdown with their text, the notes and the table.
- `from`/`to` limit the slides; a big sheet is capped.
- Without the libraries, the tool explains what to install.
- In a real session, the agent reads a PPTX's speaker notes through the tool.
- `verify` passes.
