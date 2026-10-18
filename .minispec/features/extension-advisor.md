# The agent as an advisor on extensions

Issue: [#64](https://github.com/falkenslab/agent-kit/issues/64)

## Goal

The agent can look at its catalogs itself, so that when a request matches an extension the person lacks, it suggests it in one sentence (what it adds, what it needs), and it helps install and configure extensions without ever doing it unasked.

## Context

- The prompt's Extensions section (`src/core/extensions.ts`) and `about_me` (`src/extensions/awareness/`) say which extensions are active and why others are off; the agent knows nothing of what its catalogs offer.
- The person browses them with `/extensions search` and `extension search`, over `extensionCatalog()` (`src/core/extensionCatalog.ts`), filtered by the agent's `catalogTopics`.
- Installing asks for confirmation from any marketplace but the agent's own; options are given at install or with `config` (#55, #56).
- Capabilities (#62) and requirements (#63) are what make a suggestion useful: "moodle-teacher grades with your rubrics; it needs your Moodle site".
- miyagi and padawan will rely on agent-extensions (Moodle, labs, videos, curricula, documents); their people won't know these exist unless the agent says. Moodle is two extensions, one per role: `moodle-teacher` for miyagi and `moodle-student` for padawan, so each agent's `catalogTopics` must lead it to its own.

## Changes

- A read-only tool, in awareness or an internal extension of its own, that tells three things apart in its answer:
  - **Installed here**: in each scope, active or off (and why), with their capabilities and options set or missing.
  - **Offered, from the local copies**: the known marketplaces' catalogs as copied (`.marketplaces/`), searched by capability, topic, name or description and filtered by `catalogTopics`: instant, no network, each marketplace with the age of its copy.
  - **Offered now, from the remote catalogs**: with `refresh`, the copies are fetched again from their source first (as `marketplace update`, the agent's own marketplace included), and it says what's new: extensions not in the old copy, and newer versions of installed ones.
- Refreshing only renews the catalogs' copies, never what's installed, so the tool stays read-only for plan mode. At most once per marketplace and session; the prompt asks for it when a copy is old (a week, configurable) or the person asks what's new. Without network it answers from the local copies and says so.
- A rule in the prompt: when a request matches an extension that isn't installed or enabled, suggest it in one sentence and go on with what can be done without it; never install, enable or configure one unless the person asks; installing stays `/extensions install` with its confirmation.
- No loops: an extension the person declines isn't suggested again in that conversation (kept in the session's state, not in memory).
- A built-in skill on extensions: what each installed one can do, how to set its options (and that secrets go through `extension config` or the agent's settings, never the chat), why one is off, what a catalog offers for a task, and how to add a marketplace.
- Hosts with a graphical catalog: the controller can give the suggestion's extension so the host opens its card (the captain's drawer).
- Tests: the search over a local marketplace (filtered by topics, installed marked, off with its reason, the copy's age); `refresh` over a git marketplace given a new commit (a new extension and a newer version reported, nothing installed changed, a second refresh in the session not fetching); a failed fetch falling back to the copy; a declined extension not suggested again; the tool read-only in plan mode.
- Docs: Extensions → installing (the agent's own suggestions), the awareness page, and Captain Whiskers'.

## Acceptance

- With weather in a known marketplace and not installed, asking the captain "what's the weather like?" gets a one-sentence suggestion of weather, and nothing is installed.
- Declining it, then asking again in the same conversation, gets no second suggestion.
- An agent with `catalogTopics: ["miyagi"]` never suggests an extension outside them: asked to grade a Moodle assignment without it, miyagi suggests `moodle-teacher`, and padawan, asked what's due, `moodle-student`, never the other role's.
- Asked "what extensions do I have, and is there anything new?", the agent answers what's installed and its state, apart from what the catalogs offer, and after a refresh names an extension published since the last copy.
- The search tool works in plan mode; with no network it answers from the local copies and says how old they are.
- `verify` passes.
