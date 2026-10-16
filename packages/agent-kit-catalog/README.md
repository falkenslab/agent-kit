<div align="center">

<img src="https://raw.githubusercontent.com/falkenslab/agent-kit/main/docs/static/img/logo.svg" alt="agent-kit logo" width="112"/>

# @falkenslab/agent-kit-catalog

**A Claude Code marketplace's extensions as one `catalog.json`, ready to show as a grid.**<br/>
Names, versions, topics, install commands and images, checked in CI, with no dependencies.

[![npm](https://img.shields.io/npm/v/@falkenslab/agent-kit-catalog?color=cb3837&logo=npm)](https://www.npmjs.com/package/@falkenslab/agent-kit-catalog)
![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)
![Claude Code marketplace](https://img.shields.io/badge/Claude%20Code-marketplace-d97757)
[![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)](https://github.com/falkenslab/agent-kit/blob/main/packages/agent-kit-catalog/LICENSE)

**[📖 Documentation](https://falkenslab.github.io/agent-kit/docs/next/extensions/publishing#the-catalog-file)**

</div>

agent-kit-catalog reads a [Claude Code marketplace](https://code.claude.com/docs/en/plugins/marketplace-reference) (`.claude-plugin/marketplace.json` and each extension's `.claude-plugin/plugin.json`) and writes `catalog.json`: one file a web page, an agent or any client reads to show the marketplace without cloning it. It's the format [agent-kit](https://github.com/falkenslab/agent-kit) defines, and it works for any marketplace whose extensions live in its repository.

## ✨ Why agent-kit-catalog

- 🧩 **No dependencies.** `npx` runs it in a second, in any CI.
- 📐 **One contract.** What it writes fits agent-kit's `marketplace-catalog.schema.json`, and an extension's `metadata["agent-kit"]` must fit `agent-kit-metadata.schema.json`, or it says what doesn't.
- 🔁 **Never stale.** `--check` fails when `catalog.json` isn't what it would write: a pull request that changes an extension and forgets the catalog doesn't pass.
- 🌿 **The same on every branch.** Its links point to `main` (or `--branch`), never the branch checked out.
- 🖼️ **Images that load anywhere.** An extension's logo and banner become `raw.githubusercontent.com` URLs.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20 or later. At the root of the marketplace's repository:

```bash
npx @falkenslab/agent-kit-catalog            # writes catalog.json
npx @falkenslab/agent-kit-catalog --check    # in CI: fails when it's out of date
```

The repository its links point to comes from `--repo owner/name`, else `GITHUB_REPOSITORY` (set in GitHub Actions), else the `origin` remote, else the `repository` every `plugin.json` names; the branch from `--branch`, else `main`.

## 🧰 What's inside

| Field | Where it comes from |
| --- | --- |
| 🏷️ `name`, `version`, `description` | The marketplace entry and its `plugin.json` (their versions must match) |
| 🔎 `topics` | `plugin.json`'s `keywords`, the entry's `tags`, `keywords` and `category`, lowercased |
| 🖼️ `logo`, `banner` | `metadata["agent-kit"].catalog` in `plugin.json`: images inside the extension's folder |
| ✨ `capabilities` | `metadata["agent-kit"].capabilities`: what it lets the agent do, every language it gives (the skills each names must exist) |
| 📦 `install` | The commands for Claude Code and for an agent on agent-kit |

## 🛠️ Developing

It lives in agent-kit's repository (`packages/agent-kit-catalog/`), next to the schemas it follows (`schemas/`), and agent-kit's tests check what it writes against them.

<div align="center">

Made with 💖 by Falken's Lab Team

</div>
