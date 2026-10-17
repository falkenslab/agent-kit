# A Canva extension

Issue: [#66](https://github.com/falkenslab/agent-kit/issues/66)

## Goal

A `canva` extension in agent-kit-extensions, built on Canva's official remote MCP server, that lets an agent create, edit and export Canva designs for the person, and is #61's end-to-end example of a remote server behind OAuth.

## Context

- Canva runs an official remote MCP server: `https://mcp.canva.com/mcp`, Streamable HTTP, OAuth sign-in ([docs](https://canva.dev/docs/mcp/)). Its tools create and edit designs, manage assets and brand kits, search the library, export and comment. The Canva Dev MCP Server (for building Canva apps) is a different product and isn't this.
- #61 ends with "an example extension with a remote server in agent-kit-extensions, once one works end to end". Canva covers the hardest case (OAuth); a server without auth or with a header token is a subset.
- Canva for Education is free for teachers, so the example is useful as well as a demo.
- Unknown: whether Canva's OAuth accepts the CLI driven by the SDK as a client (some remote servers allow only listed clients and no dynamic registration). If not, the fallback is the person's claude.ai Canva connector, the opt-in #61 researches.
- Unknown: which tools depend on the person's Canva plan (brand kits, autofill…).
- agent-kit-extensions' rule: an extension knows its platform, not the domain around it. Its skills say how things are done in Canva; how to design a worksheet, an infographic or slides for a class belongs to miyagi, whose skills use the extension through its capabilities.
- Exporting gives a download link, probably short-lived; publishing a design in a course means that file reaching moodle-teacher's upload tools.
- What the model sends to Canva leaves the computer: a certificate or a class list carries students' names (#61's guard for student data).
- Nothing to install on the computer: no requirements (#63).

## Changes

Kit side, in #61's order: `http` servers in an extension's `.mcp.json` first with a server without auth, then OAuth with Canva. This note needs both.

In agent-kit-extensions:

- `extensions/canva/`: `.mcp.json` with the `http` server and no `command`; `plugin.json` with `metadata["agent-kit"]` (`labels` for every tool in `en` and `es`, `help`, `catalog` assets, `capabilities` as in #62); a `README.md`; a row in the root README's table; `catalog.json` regenerated.
- Its name, description and assets don't pass for Canva's own: no Canva logo, and the description says it uses Canva's official MCP server.
- Skills, written to the agent in English, naming the server's real tools, each saying what needs the person's yes (creating, editing, exporting, commenting; the reads don't):
  - working with designs: finding, creating from a type or a template, editing, and what Canva imposes (sizes, pages, types);
  - brand kits: using the person's or their school's kit when there is one, and what to do on a plan without it;
  - exporting: which format for which use (PDF for print, PNG/JPG for images, a link for sharing), and that the download link expires;
  - what never goes to Canva without the person's yes (students' personal data).
- Capabilities with neutral ids (e.g. `design-create`, `design-export`), so an agent's skill depends on what can be done, not on Canva.
- Publishing in a course is miyagi's skill, not this extension's: it `requires` `design-export` and moodle-teacher's resource capability; the export's file reaching Moodle's upload is checked end to end.
- A plan without a feature: the skills say so and offer what the plan allows, instead of failing.

## Acceptance

- `claude plugin validate --strict extensions/canva` passes and the catalog generator's `--check` passes.
- In an agent on the kit: `extension add` installs it, saying it talks to `mcp.canva.com`; `/extensions` shows "needs sign-in" until the person signs in from the chat; then a design is created, edited and exported, and a new session doesn't ask to sign in again.
- In plan mode, the server's read-only tools work and the rest are stopped.
- The capabilities show in Spanish in a Spanish session's `/extensions` and on its catalog card.
- A design exported from Canva is uploaded to a Moodle course through moodle-teacher, in one conversation.
