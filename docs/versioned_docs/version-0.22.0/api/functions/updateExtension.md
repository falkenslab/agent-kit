# Function: updateExtension()

```ts
function updateExtension(
   dirs, 
   name, 
   options?
): Promise<{
  from?: string;
  name: string;
  scope: keyof ExtensionDirs;
  to?: string;
}>;
```

Defined in: [core/extensionCatalog.ts:168](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionCatalog.ts#L168)

Updates an installed extension from the marketplace it came from: a fresh copy of the
marketplace, then installed again in the same scope (its data and options kept). One that
didn't come from a marketplace is installed again with `extension add`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dirs` | [`ExtensionDirs`](../interfaces/ExtensionDirs.md) |
| `name` | `string` |
| `options` | \{ `official?`: `string`; \} |
| `options.official?` | `string` |

## Returns

`Promise`\<\{
  `from?`: `string`;
  `name`: `string`;
  `scope`: keyof [`ExtensionDirs`](../interfaces/ExtensionDirs.md);
  `to?`: `string`;
\}\>
