# Type Alias: PluginSource

```ts
type PluginSource = 
  | string
  | {
  ref?: string;
  repo: string;
  sha?: string;
  source: "github";
}
  | {
  ref?: string;
  sha?: string;
  source: "url";
  url: string;
}
  | {
  path: string;
  ref?: string;
  sha?: string;
  source: "git-subdir";
  url: string;
}
  | {
[field: string]: unknown;
  source: string;
};
```

Defined in: [core/marketplaces.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/marketplaces.ts#L22)

Where a marketplace's plugin comes from, as `marketplace.json` says (Claude Code's forms).
