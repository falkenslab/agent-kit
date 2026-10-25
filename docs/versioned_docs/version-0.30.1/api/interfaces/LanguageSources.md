# Interface: LanguageSources

Defined in: [core/language.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L11)

Where the language can come from, in order of precedence.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argv"></a> `argv?` | readonly `string`[] | The process's arguments; `--language=<code>` wins over everything else. | [core/language.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L13) |
| <a id="property-env"></a> `env?` | `Readonly`\<`Record`\<`string`, `string` \| `undefined`\>\> | The environment, for `LC_ALL`, `LC_MESSAGES` and `LANG` (e.g. "fr_FR.UTF-8"). | [core/language.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L19) |
| <a id="property-locale"></a> `locale?` | `string` | The system's locale, e.g. "es-ES" (`Intl`). | [core/language.ts:17](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L17) |
| <a id="property-option"></a> `option?` | `string` | The agent's own choice (its code or configuration). | [core/language.ts:15](https://github.com/falkenslab/agent-kit/blob/main/src/core/language.ts#L15) |
