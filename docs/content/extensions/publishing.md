---
sidebar_position: 8
title: Publishing a marketplace
description: Publish extensions as a Claude Code marketplace - its repository, marketplace.json, versions and topics, catalog.json built with @falkenslab/agent-kit-catalog, a public catalog page, its CI, and being an agent's official marketplace.
---

# Publishing a marketplace

Extensions are published as a [Claude Code marketplace](https://code.claude.com/docs/en/plugins/marketplace-reference): a git repository (or a folder) with `.claude-plugin/marketplace.json` listing them. The same repository serves Claude Code and every agent on the kit. Falken's Lab's is [falkenslab/agent-kit-extensions](https://github.com/falkenslab/agent-kit-extensions).

## The repository

```text
my-extensions/
├── .claude-plugin/marketplace.json   the list: its name, its owner, an entry per extension
├── weather/                          an extension, as in "Writing one"
├── moodle/                           another
├── catalog.json                      the catalog, built (below)
├── site/index.html                   optional: a public page drawn from catalog.json
├── .gitattributes                    * text=auto eol=lf
└── .github/workflows/                validation, the catalog, the page
```

```json title=".claude-plugin/marketplace.json"
{
  "name": "ada",
  "owner": { "name": "Ada Lovelace" },
  "metadata": { "description": "Ada's extensions." },
  "plugins": [
    { "name": "weather", "source": "./weather", "version": "0.1.0", "description": "The weather in your city: today and the next days.", "category": "productivity", "tags": ["weather"] }
  ]
}
```

- **`name`** is how its extensions are named: `weather@ada`.
- **An entry's `source`** is where the extension is: a folder of the repository (`./weather`, kept with it, the simplest), or another repository, a folder of one, an npm package or a zip ([Marketplace sources](reference.md#marketplace-sources)).
- **`version`** must match the extension's `plugin.json` (Claude Code warns otherwise, and the catalog refuses it).
- **`description`, `category`, `tags`** show in a catalog; with the extension's `keywords`, they're its [topics](installing.md#the-catalog).

People add it with `claude plugin marketplace add owner/repo` in Claude Code, or `my-agent extension marketplace add owner/repo` in an agent.

## Topics and audiences

A topic is any word an extension is about or for, lowercased: `weather`, `moodle`, `teaching`. An **audience** is a topic too: tag an extension `miyagi` and an agent that offers only its own (`catalogTopics: ["miyagi"]`) shows it, while one that offers every extension shows it as well. One marketplace can so serve several agents, each seeing what's meant for it.

## The catalog file

Outside an agent, a marketplace shows its extensions from one file, `catalog.json` at its root: each extension's name, version, description, topics, category, author, links, install commands, its [capabilities](overview.md#capabilities) (every language it gives, for the page to choose), and its logo and banner as URLs anyone can load. A page draws a grid from it, and any client reads it without cloning the repository. Agents don't need it: their catalog reads the marketplace's copy.

`@falkenslab/agent-kit-catalog` writes it, with no dependencies:

```bash
npx @falkenslab/agent-kit-catalog            # writes catalog.json
npx @falkenslab/agent-kit-catalog --check    # in CI: fails when it's out of date
```

- **Where its links point**: `--repo owner/name`, else `GITHUB_REPOSITORY` (GitHub Actions), else the `origin` remote, else the `repository` every `plugin.json` names; the branch `--branch`, else `main` (never the one checked out, so the file reads the same on every branch and `--check` passes on pull requests).
- **What it checks**: each extension's version matches its entry, its images exist inside its folder, the skills its capabilities name exist, and its `metadata["agent-kit"]` fits agent-kit's schema; it says every problem at once and writes nothing.
- **Only extensions kept in the repository** are cataloged (a `./folder` source).

```json title="catalog.json (one extension)"
{
  "name": "weather",
  "version": "0.1.0",
  "description": "The weather in your city: today and the next days.",
  "category": "productivity",
  "topics": ["weather", "planning", "productivity"],
  "author": "Ada Lovelace",
  "license": "MIT",
  "homepage": "https://github.com/ada/my-extensions/tree/main/weather",
  "readme": "https://github.com/ada/my-extensions/blob/main/weather/README.md",
  "install": { "claudeCode": "claude plugin install weather@ada", "agentKit": "extension add weather@ada" },
  "capabilities": [
    { "id": "weather-forecast", "skills": ["plan-the-day"], "tools": ["forecast"], "texts": { "en": { "label": "Planning around the weather", "description": "Today's and the next days' forecast in your city." } } }
  ],
  "logo": "https://raw.githubusercontent.com/ada/my-extensions/main/weather/assets/logo.svg"
}
```

The format is agent-kit's contract: `schemas/marketplace-catalog.schema.json` (the file) and `schemas/agent-kit-metadata.schema.json` (`metadata["agent-kit"]`), shipped in `@falkenslab/agent-kit`.

## A public page

`catalog.json` is enough for a static page: a grid of cards (logo, name, version, description, topics), a search, topic chips, and each extension's details with its install commands. Falken's Lab's [extensions page](https://falkenslab.github.io/agent-kit-extensions/) is one file, `site/index.html`, that fetches `catalog.json`; `?topic=miyagi` opens it filtered, so an agent can link to what it offers. Its source is in [agent-kit-extensions](https://github.com/falkenslab/agent-kit-extensions/tree/main/site): copy it for your own.

## Its CI

```yaml title=".github/workflows/validate.yml"
name: validate
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install --global @anthropic-ai/claude-code@latest
      - run: npx @falkenslab/agent-kit-catalog --check
      - run: claude plugin validate --strict .
      - run: for plugin in */.claude-plugin/plugin.json; do claude plugin validate --strict "$(dirname "$(dirname "$plugin")")"; done
```

A second workflow publishes `site/index.html` and `catalog.json` on GitHub Pages (Pages' source set to GitHub Actions): see agent-kit-extensions' `pages.yml`.

## Releasing an extension

1. Change it, build it (`npm run build` for a bundled server), and raise its `version` in `plugin.json` and its marketplace entry.
2. `npx @falkenslab/agent-kit-catalog` to write the catalog again.
3. Commit and push: the CI validates it, and the page follows.

People's agents see the new version as an update in their catalog (`extension update`, or the Update button); Claude Code's `claude plugin update`.

## An agent's official marketplace

An agent names its own marketplace, so its users find its extensions without adding anything, and install them without a confirmation:

```ts
const config = { /* … */ officialMarketplace: "ada/my-extensions", catalogTopics: ["my-agent"] };
await runExtensionCommand(argv, { dirs, command: "my-agent", official: "ada/my-extensions", catalogTopics: ["my-agent"] });
```

Captain Whiskers' is a folder shipped with him, `shipyard`; miyagi's could be Falken's Lab's, with `catalogTopics: ["miyagi"]`.
