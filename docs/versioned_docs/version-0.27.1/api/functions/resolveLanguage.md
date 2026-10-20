# Function: resolveLanguage()

```ts
function resolveLanguage(sources): ResolvedLanguage;
```

Defined in: [core/language.ts:51](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L51)

The language for the kit's texts and the agent's replies: `--language=<code>`, then the
agent's option, then the system's language, then English. A code that is asked for but
isn't supported falls through to the next source, with a warning. Pure: `detectLanguage()`
fills the sources from the running process.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `sources` | [`LanguageSources`](../interfaces/LanguageSources.md) |

## Returns

[`ResolvedLanguage`](../interfaces/ResolvedLanguage.md)
