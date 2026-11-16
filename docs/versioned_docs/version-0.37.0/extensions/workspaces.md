---
sidebar_position: 5
title: Workspaces
description: A project's extensions - the lock that travels with the project, the code kept by content in the agent's store, data and secrets kept out of the project, restoring them on another computer, and trusting them before they run.
---

# Workspaces

A project's scope travels with the project: a repository others clone, a folder someone sends. So it keeps only what's the workspace's, and the rest stays on each computer, in the agent's folder. (An agent without a scope of its own keeps a project's code and data in the project, as the agent's scope does.)

## What goes where

| What | Where | Travels with the project |
| --- | --- | --- |
| 🔒 The lock: which extensions, from where, at which version (files' hash, commit, npx packages), and the options that aren't secrets | `<project>/extensions/extensions.lock.json` | Yes: commit it |
| 📦 The code, by content: two workspaces with the same version share one copy | `<agent scope>/.store/<name>/<hash>/` | No |
| 🗄️ Each extension's data | `<agent scope>/.projects/<project>-<hash>/.data/<name>/` | No |
| 🔑 Its secrets | `<agent scope>/.projects/<project>-<hash>/.secrets/<name>.json` | No |
| ✅ What the person trusts | `<agent scope>/.trust.json` | No |

## Restoring

On another computer, or with another agent, a workspace's extensions are off, saying their code isn't there yet. `extension restore` gets each from where its lock says:

- **from its marketplace**, if the agent knows it (the official one always);
- **from its git repository**, at the commit the lock recorded;
- **from its folder**, if it's on this computer;

and checks it against the lock's hash, then fetches the npx packages it locks. What can't be got says why: a marketplace the agent doesn't know (`extension marketplace add` it first), another version there now (`extension update` takes it, and the lock changes), a folder that isn't on this computer.

The hash doesn't count text files' line endings, so a repository checked out with CRLF on Windows and LF on Linux matches. A binary file (one with a NUL byte) counts as it is.

## Trusting

An extension that comes with a workspace runs code on this computer, so it runs only once the person trusts it in that workspace:

- **The chats ask** when the session opens with untrusted ones (no by default), naming each and where it comes from; trusted, the session opens again with them, keeping the conversation. Declined, they stay off, and `/extensions trust` trusts them later.
- **From a shell**: `extension trust [name…]`, or `extension restore --trust` to get and trust them at once.
- **What's trusted is each extension's code**, its files' and npx packages' hashes, kept in the agent's folder, outside the project, so a project can't trust itself. Another version (the lock changed, someone updated it) asks again; turning one on or off, or changing its options, doesn't.
- **What the person installs or updates** into the project's scope themselves is trusted as they do it.
- **The agent's own scope never asks**: it's the person's.

A session the agent builds itself reads the untrusted ones from `buildSessionOptions()`'s `extensions.untrusted`; `trustWorkspace(dirs)` and `restoreExtensions(dirs)` do the rest.

## A typical flow

```console
# Ada sets the workspace up and commits extensions/extensions.lock.json
$ my-agent extension add weather@ada --project --set city=Madrid

# Bob clones it: weather is off ("isn't on this computer yet")
$ my-agent extension restore --trust
Restored weather.
Trusted weather in this workspace.
```

Bob's weather has Ada's city (a shared option) and his own data; a secret it needs, he sets on his computer (`extension config`).
