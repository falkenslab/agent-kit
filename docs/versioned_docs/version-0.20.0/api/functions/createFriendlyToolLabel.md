# Function: createFriendlyToolLabel()

```ts
function createFriendlyToolLabel(options?): (toolName, toolInput) => string;
```

Defined in: [core/toolLabels.ts:124](https://github.com/falkenslab/agent-kit/blob/main/src/core/toolLabels.ts#L124)

Builds a `friendlyToolLabel(toolName, toolInput)` — `describe` lets the host agent
layer its own domain-specific cases (e.g. Playwright's browser_* tools) on top of this
kit's generic ones; `extraLocalServers` names any *additional* MCP server (beyond this
kit's own "approvals"/"manualLogin"/"time") whose tools should be unwrapped
without a "[server] " prefix, e.g. "playwright".

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `describe?`: [`ToolDescriber`](../type-aliases/ToolDescriber.md); `extraLocalServers?`: readonly `string`[]; \} |
| `options.describe?` | [`ToolDescriber`](../type-aliases/ToolDescriber.md) |
| `options.extraLocalServers?` | readonly `string`[] |

## Returns

(`toolName`, `toolInput`) => `string`
