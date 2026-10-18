---
name: extensions
description: Helping the person with this agent's extensions - what each installed one lets you do, setting its options, why one is off, what the catalogs offer for a task, signing in to a remote one, installing, updating and removing, adding a catalog. Load it whenever the person asks about extensions, or when you're about to suggest one.
---

# Helping with extensions

Extensions add what you can do: tools, skills and the know-how to use them (a Moodle classroom, a weather forecast, a lab). What's installed and what the catalogs offer come from `extensions_catalog`, read anew each time: never answer from memory. Answer in the language you reply in, briefly, with the exact command; commands are typed as written here. Without `extensions_catalog` among your tools, this agent has no folder for extensions and can't install any: say so, and suggest nothing.

## What you never do

- Install, enable, disable, configure or remove an extension yourself: the person does, with the commands below. You suggest and explain.
- Ask for a secret (a token, a password) in the chat: what's typed there is kept in its history. Secrets are set in the agent's settings or from a terminal (`<agent> extension config <name> <key>`, which asks without showing it).
- Suggest an extension the catalog didn't return, or one the person already declined in this conversation.

## Suggesting one

When the task needs what an extension does and it isn't installed, or it's off: one sentence with what it adds, what it needs (a program, a site, an account) and how to install it, then go on with what you can do without it.

> The **weather** extension would give me today's forecast for your city; install it with `/extensions install weather@falkenslab` and tell me your city. Meanwhile, here's what I can plan without it…

An extension that talks to a remote service sends what you give it there: say so when the person's data is involved.

## Commands in the chat

| Command | What it does |
| --- | --- |
| `/extensions` | What's running, what's off and why, what's installed |
| `/extensions search <words>` | What the catalogs offer |
| `/extensions install <name>@<marketplace>` | Installs one (one from a catalog that isn't the agent's own asks for confirmation) |
| `/extensions reload` | Opens the session again with what's installed now, keeping the conversation |
| `/extensions update [name]` | Updates one, or every one with a newer version |
| `/extensions remove <name>` | Uninstalls one (`--delete-data` deletes its data too) |
| `/extensions enable <name>` | Turns one on |
| `/extensions disable <name>` | Turns one off, keeping it installed |
| `/extensions config <name> [key=value…]` | Its options, and setting the ones that aren't secret |
| `/extensions sign-in <name>` | Signs in to its remote service: gives the link to open |
| `/extensions sign-out <name>` | Signs out of its remote service |
| `/extensions trust` | Lets the workspace's extensions run |

A new catalog (a marketplace) is added from a terminal: `<agent> extension marketplace add <owner/repo>`.

## Why one is off

`extensions_catalog` and `/extensions` give the reason; explain it and its remedy in plain words:

- **An option without a value** (its site, its account): `/extensions config <name> <key>=<value>`, or the settings for a secret.
- **A program missing on the computer** (Docker, ffmpeg): what it is, and the install command for this system the reason gives. The extension never installs it.
- **It needs signing in**: `/extensions sign-in <name>`, then open the link.
- **It requires another extension's capability**: install or enable the one that provides it.
- **Its files changed** or **its workspace isn't trusted**: reinstall it, or `/extensions trust`.
- **This agent's kit version is outside its range**: an update of the agent or of the extension.

## What's new

`extensions_catalog` with `refresh: true` fetches the catalogs again and says what's new: extensions added since the last copy, and newer versions of installed ones (`/extensions update`). Without network it answers from the copies on this computer and says how old they are.
