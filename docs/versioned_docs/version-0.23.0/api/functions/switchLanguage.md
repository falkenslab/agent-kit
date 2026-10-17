# Function: switchLanguage()

```ts
function switchLanguage(language): void;
```

Defined in: [core/messages/index.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/index.ts#L73)

Switches the kit's language on purpose, e.g. the person picked another in a chat (#47): from
then on it wins over `--language` and `config.language`, until switched again. The session
says so to the model when it opens next (the controller's `setLanguage()` reopens it).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `language` | [`Language`](../type-aliases/Language.md) |

## Returns

`void`
