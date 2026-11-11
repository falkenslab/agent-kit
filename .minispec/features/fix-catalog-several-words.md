# A several-word catalog search matches nothing unless one extension has every word

Issue: [#94](https://github.com/falkenslab/agent-kit/issues/94)

## Problem

- `extensions_catalog` with `words` finds nothing for a reasonable need described in several words, even when the catalog has the right extensions.
- Seen in miyagi (0.34.0): `words: "gamification games interactive visual style children"` gave "Nothing matches.", and the agent told a teacher nothing offers games or styles, though `moodle-ui-kit` (topic `style`) and `h5p` (topic `interactive`) were there. miyagi now tells its agent to search in one or two words, as a workaround.

## Cause

`extensionCatalog()` (`src/core/extensionCatalog.ts`) keeps an extension only when its text includes every word (`words.every(...)`).

## Solution

- An extension matches when any word does; the list is ranked by how many words match, a word in its name or topics weighing more than one in its description or capabilities. Ties keep the catalog's order.
- "Nothing matches" only when no word matches anything.
- The tool's description says the results come closest first.
- Docs (English and Spanish): the extensions guide.

## Verification

- Tests: a several-word query returns the extensions that match some word, the one matching most first, a name or topic match ahead of a description match; a query no extension matches still says nothing matches.
- `verify` passes.
