---
sidebar_position: 3
title: Versioning
description: How the kit is versioned and released, and how this documentation follows the versions.
---

# Versioning

## The package

`@falkenslab/agent-kit` follows [semantic versioning](https://semver.org). While it's in `0.x`:

- a **minor** version (`0.12.0` → `0.13.0`) adds features and may change behavior or the API;
- a **patch** version (`0.12.0` → `0.12.1`) only fixes things.

Each release is a git tag (`vX.Y.Z`), a [GitHub release](https://github.com/falkenslab/agent-kit/releases) with notes (new features, fixes, breaking changes with how to migrate) and the same version on [npm](https://www.npmjs.com/package/@falkenslab/agent-kit). Read the notes before bumping; pin the minor version you tested (`"^0.13.0"` allows patches only while in `0.x`).

## This documentation

The site keeps one version of the documentation per release:

- **the version selector** (top right) lists them;
- **the default is the latest release**, under `/docs`;
- **"Next (unreleased)"** is what's on `main` and not released yet, under `/docs/next`, with a banner;
- older releases stay under `/docs/<version>`.

Each version includes its own API reference, generated from that version's source.

Documentation is part of the release: every change to the kit updates `docs/` in the same change, and each release snapshots it as a new version before publishing.
