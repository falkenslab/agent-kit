# Function: restoreExtensions()

```ts
function restoreExtensions(dirs, options?): Promise<{
  failed: object[];
  restored: string[];
}>;
```

Defined in: [core/extensionCatalog.ts:218](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L218)

Gets what a workspace's lock lists and this computer lacks (#57): each extension's code into
the agent's store, from where it came (its marketplace, its git repository at its commit, its
folder), checked against the lock's hash, and the packages its npx servers run into the
agent's cache. It trusts nothing: the workspace still asks before they run. What can't be got
says why (a marketplace the agent doesn't know, another version there now, a folder that isn't
on this computer).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `options` | \{ `official?`: `string`; \} |
| `options.official?` | `string` |

## Returns

`Promise`\<\{
  `failed`: `object`[];
  `restored`: `string`[];
\}\>
