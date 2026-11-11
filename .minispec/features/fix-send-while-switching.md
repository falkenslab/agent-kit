# A line sent while the chat switches sessions is lost, and the chat stays busy

Issue: [#93](https://github.com/falkenslab/agent-kit/issues/93)

## Problem

- In a host built on `createChatController()`, a `send()` that arrives while `newConversation()` or `resume()` is opening the session is lost: the chat stays `busy`, with an empty transcript, and no turn ever ends.
- Seen in miyagi (0.34.0): "New conversation" followed at once by a message, two times out of two; only miyagi's own 5-minute watch got it out. miyagi now makes `send` wait in its host as a workaround.

## Cause

- `newConversation()` and `switchTo()` (used by `resume()`, and by reopening the session for an extension) end the input queue and close the run, then await `openSession()`, and only then connect the new queue.
- A `send()` in that await goes to `runTurn()`: it sets `busy`, pushes the line into the ended queue (nobody reads it) and waits for a turn that never comes. Then `update({ transcript: [] })` wipes the line too.

## Solution

- The controller knows it is switching (one promise for the switch under way). `send()` waits for it, then sends into the new session; `steer()` returns `false` while switching (there is no turn to steer).
- The same for every path that reopens the session, not only the two in the issue.
- Docs (English and Spanish): custom hosts.

## Verification

- A test with a fake `runQuery`: `send()` right after `newConversation()` and after `resume()` (not awaited) reaches the new session, is answered and stays in the transcript; the chat isn't left busy.
- `verify` passes.
