# Type Alias: ToolDetail

```ts
type ToolDetail = "full" | "calls" | "summary";
```

Defined in: [tui/ink/toolGroup.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/toolGroup.ts#L29)

How much of its tool calls a chat shows: `"full"`, every call with its result line;
`"calls"`, the calls without their results (a failed call says so in one short line);
`"summary"`, one line per group. Ctrl+O unfolds any of them into the full view.
