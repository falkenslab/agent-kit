# Read and Glob can reach any path

Issue: [#28](https://github.com/falkenslab/agent-kit/issues/28)

## Problem

The file scope gate (`hooks/fileScopeGate.ts`, ADR-007) allow-lists `Write`/`Edit` (`writableDirs`) and `Grep` (`searchableDirs`), but not `Read` or `Glob`:

- `Read` is allowed on any path but `deniedPaths` and the `toolOnlyDirs` (the knowledge folder): an agent or its subagents can read `~/.ssh`, `~/.aws`, browser profiles, other projects' `.env`, documents with personal data.
- `Glob` is only refused inside, or from above, a `toolOnlyDirs` folder, and doesn't check `deniedPaths` at all: it can list any folder, and file names alone can leak (`notas_3B_<alumno>.xlsx`).

An agent that reads untrusted content (web pages, student submissions, forum posts) can be prompt-injected into reading a file and putting it in a reply or in something it publishes. Found in miyagi: its agent could read `~/.miyagi/config.json` (an OAuth token) and `~/.claude/.credentials.json`.

## Cause

The scope was designed to keep writes and content searches inside the project (ADR-007), and `Read` was left open with a deny-list. A deny-list can't fix it: it never names every secret, and Windows has many spellings of one path.

## Solution

Mechanism in the kit, policy in the agent:

- `FileScope.readableDirs`: an allow-list for `Read` and `Glob`, like `writableDirs` and `searchableDirs`; `deniedPaths` still wins inside it. The agent widens it with a config field (e.g. `BaseSessionConfig.extraReadableDirs`).
- `Glob` checks `deniedPaths` and the allow-list from where the search really starts (its path plus the pattern's fixed folders, as today for `toolOnlyDirs`).
- The kit adds what only it knows: the project's own folders (sources, writable dirs), the run folder, the plugin roots it loads (its own and the agent's), and the SDK's tool-results folder for the session (`~/.claude/projects/<project>/<session>/tool-results/`, which agents need to `Read` large outputs). It denies the SDK's credentials (`~/.claude/.credentials.json`). The knowledge folder stays reachable only through the `knowledge_*` tools.
- Default: opt-in first (an agent turns the allow-list on), so padawan and miyagi don't change until they adopt it; the default in the next breaking release. To decide: whether the allow-list being on is a spec flag or follows from declaring `readableDirs`.
- Denials say what can be read instead, as `Write` and `Grep` already do.
- Bash, when a subagent has it, stays outside the gate, as documented (ADR-003, ADR-007).
- To check first: how the tool-results folder's path can be known (the SDK's session id comes after the options are built), and that a subagent's calls go through the same gate.

## Verification

- Tests: with the allow-list on, `Read` of `~/.ssh/<file>`, a sibling project's `.env` and `~/.claude/.credentials.json`, and `Glob` of `~/Documents`, are refused; reading the session's tool results, a plugin's skill file and a source still works. The same from a subagent (`agent_id` set).
- Without it, behaviour is unchanged (padawan and miyagi).
- Captain Whiskers turns it on and declares what it reads; a real session still learns from the chest and reads its skills.
- Docs: `security/file-scope.md` lists what each tool can reach; ADR-007 updated.
