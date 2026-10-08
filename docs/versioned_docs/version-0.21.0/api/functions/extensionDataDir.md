# Function: extensionDataDir()

```ts
function extensionDataDir(scopeDir, name): string;
```

Defined in: [core/externalExtensions.ts:118](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L118)

An installed extension's data folder: `${CLAUDE_PLUGIN_DATA}` in its servers' arguments and
variables (a browser profile, a cache), in its scope, outside its plugin and its hash, so it's
kept across sessions and updates. Created when a session starts it; removing the extension
asks before deleting it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scopeDir` | `string` |
| `name` | `string` |

## Returns

`string`
