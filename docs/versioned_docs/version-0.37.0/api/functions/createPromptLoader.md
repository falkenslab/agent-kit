# Function: createPromptLoader()

```ts
function createPromptLoader(rootDir): (relativePath, vars?) => string;
```

Defined in: [core/promptTemplate.ts:9](https://github.com/falkenslab/agent-kit/blob/main/src/core/promptTemplate.ts#L9)

Builds a `loadPrompt(relativePath, vars)` bound to `rootDir` — so each agent built on this kit supplies its own
prompts directory (its own domain content) and gets the same `{{key}}`
substitution/fail-loudly behavior for free.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rootDir` | `string` |

## Returns

(`relativePath`, `vars?`) => `string`
