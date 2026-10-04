# Function: agentKitVersion()

```ts
function agentKitVersion(): string;
```

Defined in: [core/version.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/core/version.ts#L11)

The version of agent-kit in use, read from its own `package.json` (next to `dist/`, or
`src/` under tsx), e.g. to show it in an agent's header or log.

## Returns

`string`
