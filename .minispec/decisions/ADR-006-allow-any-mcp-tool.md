# ADR-006: `canUseTool` approves any MCP tool

## Decision

`canUseTool` is always `allowAnyMcpTool`: it approves every `mcp__<server>__<tool>` call and denies everything else. `disallowedTools` still takes precedence.

## Motivation

An `allowedTools` wildcard only matches one named server (`mcp__*` does not match `mcp__<server>__<tool>`, confirmed empirically), and a project's `.mcp.json` may register servers the kit can't know in advance.

## Consequences

Restricting an MCP tool is done with `disallowedTools` (as consumers do with `browser_run_code_unsafe`), not by leaving it out of an allow list. Built-in tools listed in `tools`/`allowedTools` are auto-approved before `canUseTool` is consulted.
