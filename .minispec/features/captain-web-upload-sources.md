# Captain Whiskers' web: uploading files to the chest

Issue: [#48](https://github.com/falkenslab/agent-kit/issues/48)

## Goal

The person adds documents to the captain's treasure chest (his `sources/` folder) from the web page or the app, by a button or by dropping files, without waiting for him to ask for one.

## Context

- Today a file reaches the chest only when the captain asks (`request_file`, whose dialog has a file picker since #44), when he downloads one, or when the person copies it into `workspace/treasure/` by hand: the second needs a terminal or a file explorer, and the app's chest is in its data folder.
- The sources extension keeps a manifest (`sources/.agent-kit/sources.json`: origin, hash, duplicates, `changedAt`); adding a file is its job (`addSource()` in `src/extensions/sources/sources.ts`), not a plain copy. It isn't part of the public API: an extension's `api` reaches the host only for the knowledge base (`knowledgeStore`).
- The page already uploads files (`/api/upload`, for `request_file`).

## Changes

- Kit: what an extension hands the host is passed on whole (`buildSessionOptions()` returns its `api`, by extension), and the sources extension's includes adding a file (`addSource`, with the same checks as its tools: never overwrite, duplicates recognized, the origin recorded as the person's).
- The captain's web host: `POST /api/chest` with a file, into the chest through that; refused while a turn runs.
- The page: an "Add to the chest" action (in the quick actions, and a button in the conversation's composer), and dropping files anywhere on the page; each upload shows its progress and ends in a notice ("knots.pdf is in the chest: /captain-whiskers:learn to learn it"), with a one-click "learn it now".
- Size and type limits stated (what `extract_text` and `Read` handle), on a phone too.

## Acceptance

- Dropping a PDF on the page puts it in the chest, listed by `list_sources` with the person as its origin; the same file again is recognized as a duplicate.
- "Learn it now" runs `/captain-whiskers:learn` and the logbook gets its summary.
- Works in the desktop app, whose chest is in its data folder.
