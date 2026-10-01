# Interface: Messages

Defined in: [core/messages/en.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L11)

Every text the kit shows a person, in one language. Texts for the model (tool
descriptions, hook deny reasons, the knowledge base's prompt section) aren't here: they
stay in English whatever the language.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-answeredbyfile"></a> `answeredByFile` | `string` | - | [core/messages/en.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L58) |
| <a id="property-approvaltitle"></a> `approvalTitle` | `string` | - | [core/messages/en.ts:63](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L63) |
| <a id="property-approved"></a> `approved` | `string` | - | [core/messages/en.ts:54](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L54) |
| <a id="property-auth"></a> `auth` | `object` | - | [core/messages/en.ts:97](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L97) |
| `auth.browserWillOpen` | `string` | - | [core/messages/en.ts:103](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L103) |
| `auth.cantStart` | `string` | - | [core/messages/en.ts:101](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L101) |
| `auth.generated` | `string` | - | [core/messages/en.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L104) |
| `auth.generateQuestion` | `string` | - | [core/messages/en.ts:100](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L100) |
| `auth.generatingHeading` | `string` | - | [core/messages/en.ts:102](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L102) |
| `auth.noToken` | `string` | - | [core/messages/en.ts:98](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L98) |
| `auth.noTokenDetail` | `string` | - | [core/messages/en.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L99) |
| <a id="property-currentrun"></a> `currentRun` | `string` | - | [core/messages/en.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L38) |
| <a id="property-done"></a> `done` | `string` | - | [core/messages/en.ts:57](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L57) |
| <a id="property-donecontinue"></a> `doneContinue` | `string` | - | [core/messages/en.ts:53](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L53) |
| <a id="property-error"></a> `error` | `string` | - | [core/messages/en.ts:70](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L70) |
| <a id="property-esctointerrupt"></a> `escToInterrupt` | `string` | - | [core/messages/en.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L14) |
| <a id="property-interrupted"></a> `interrupted` | `string` | - | [core/messages/en.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L27) |
| <a id="property-labels"></a> `labels` | `object` | - | [core/messages/en.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L75) |
| `labels.aFile` | `string` | - | [core/messages/en.ts:82](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L82) |
| `labels.aPage` | `string` | - | [core/messages/en.ts:90](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L90) |
| `labels.aSkill` | `string` | - | [core/messages/en.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L93) |
| `labels.aSubagent` | `string` | - | [core/messages/en.ts:88](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L88) |
| `labels.waitingManual` | `string` | - | [core/messages/en.ts:77](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L77) |
| `labels.applyingSkill` | `string` | - | [core/messages/en.ts:92](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L92) |
| `labels.askingApproval` | `string` | - | [core/messages/en.ts:76](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L76) |
| `labels.delegating` | `string` | - | [core/messages/en.ts:86](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L86) |
| `labels.delegatingTask` | `string` | - | [core/messages/en.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L87) |
| `labels.editing` | `string` | - | [core/messages/en.ts:81](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L81) |
| `labels.fetching` | `string` | - | [core/messages/en.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L89) |
| `labels.findingFiles` | `string` | - | [core/messages/en.ts:83](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L83) |
| `labels.reading` | `string` | - | [core/messages/en.ts:79](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L79) |
| `labels.running` | `string` | - | [core/messages/en.ts:85](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L85) |
| `labels.savingToSources` | `string` | - | [core/messages/en.ts:78](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L78) |
| `labels.searchingContents` | `string` | - | [core/messages/en.ts:84](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L84) |
| `labels.searchingWeb` | `string` | - | [core/messages/en.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L91) |
| `labels.writing` | `string` | - | [core/messages/en.ts:80](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L80) |
| <a id="property-no"></a> `no` | `string` | - | [core/messages/en.ts:51](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L51) |
| <a id="property-noearlierruns"></a> `noEarlierRuns` | `string` | - | [core/messages/en.ts:37](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L37) |
| <a id="property-nooutput"></a> `noOutput` | `string` | - | [core/messages/en.ts:69](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L69) |
| <a id="property-nothingtocopy"></a> `nothingToCopy` | `string` | - | [core/messages/en.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L29) |
| <a id="property-othertools"></a> `otherTools` | [`ToolPhrase`](../type-aliases/ToolPhrase.md) | - | [core/messages/en.ts:68](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L68) |
| <a id="property-proceed"></a> `proceed` | `string` | - | [core/messages/en.ts:49](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L49) |
| <a id="property-proposedaction"></a> `proposedAction` | `string` | - | [core/messages/en.ts:60](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L60) |
| <a id="property-rejected"></a> `rejected` | `string` | - | [core/messages/en.ts:55](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L55) |
| <a id="property-resumehint"></a> `resumeHint` | `string` | - | [core/messages/en.ts:35](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L35) |
| <a id="property-resumequestion"></a> `resumeQuestion` | `string` | - | [core/messages/en.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L36) |
| <a id="property-resumetitle"></a> `resumeTitle` | `string` | - | [core/messages/en.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L34) |
| <a id="property-shortcuts"></a> `shortcuts` | `string`[] | - | [core/messages/en.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L45) |
| <a id="property-stop"></a> `stop` | `string` | - | [core/messages/en.ts:52](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L52) |
| <a id="property-stopped"></a> `stopped` | `string` | - | [core/messages/en.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L56) |
| <a id="property-suggestionkey"></a> `suggestionKey` | `string` | - | [core/messages/en.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L42) |
| <a id="property-switchmodekey"></a> `switchModeKey` | `string` | - | [core/messages/en.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L20) |
| <a id="property-terminalquestion"></a> `terminalQuestion` | `string` | - | [core/messages/en.ts:59](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L59) |
| <a id="property-thinking"></a> `thinking` | `string` | - | [core/messages/en.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L13) |
| <a id="property-toolfailed"></a> `toolFailed` | `string` | A failed tool call when results are hidden (`toolDetail: "calls"`): no tool output, just that it failed. | [core/messages/en.ts:72](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L72) |
| <a id="property-toolphrases"></a> `toolPhrases` | `Record`\<`string`, [`ToolPhrase`](../type-aliases/ToolPhrase.md)\> | - | [core/messages/en.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L67) |
| <a id="property-yes"></a> `yes` | `string` | - | [core/messages/en.ts:50](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L50) |

## Methods

### context()

```ts
context(percent): string;
```

Defined in: [core/messages/en.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L18)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `percent` | `number` |

#### Returns

`string`

***

### copiedCharacters()

```ts
copiedCharacters(count): string;
```

Defined in: [core/messages/en.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L23)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### copiedReply()

```ts
copiedReply(characters): string;
```

Defined in: [core/messages/en.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L28)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `characters` | `number` |

#### Returns

`string`

***

### earlierCalls()

```ts
earlierCalls(count): string;
```

Defined in: [core/messages/en.ts:74](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L74)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### linesBelow()

```ts
linesBelow(count): string;
```

Defined in: [core/messages/en.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L22)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### mcpFailed()

```ts
mcpFailed(servers): string;
```

Defined in: [core/messages/en.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L31)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `servers` | `string` |

#### Returns

`string`

***

### mode()

```ts
mode(mode): string;
```

Defined in: [core/messages/en.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L19)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `mode` | [`Mode`](../type-aliases/Mode.md) |

#### Returns

`string`

***

### modeLocked()

```ts
modeLocked(mode): string;
```

Defined in: [core/messages/en.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L21)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `mode` | [`Mode`](../type-aliases/Mode.md) \| `undefined` |

#### Returns

`string`

***

### moreLines()

```ts
moreLines(count): string;
```

Defined in: [core/messages/en.ts:48](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L48)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### moreResultLines()

```ts
moreResultLines(count): string;
```

Defined in: [core/messages/en.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L73)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### parametersLine()

```ts
parametersLine(parameters): string;
```

Defined in: [core/messages/en.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L62)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parameters` | `string` |

#### Returns

`string`

***

### pastedText()

```ts
pastedText(id, extraLines): string;
```

Defined in: [core/messages/en.ts:44](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L44)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `number` |
| `extraLines` | `number` |

#### Returns

`string`

***

### queued()

```ts
queued(line): string;
```

Defined in: [core/messages/en.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L26)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `line` | `string` |

#### Returns

`string`

***

### resumed()

```ts
resumed(date): string;
```

Defined in: [core/messages/en.ts:39](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L39)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `date` | `string` |

#### Returns

`string`

***

### reverseSearch()

```ts
reverseSearch(query): string;
```

Defined in: [core/messages/en.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L43)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | `string` |

#### Returns

`string`

***

### summaryLine()

```ts
summaryLine(summary): string;
```

Defined in: [core/messages/en.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L64)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `summary` | `string` |

#### Returns

`string`

***

### tokens()

```ts
tokens(input, output): string;
```

Defined in: [core/messages/en.ts:17](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L17)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` |
| `output` | `string` |

#### Returns

`string`

***

### toolLine()

```ts
toolLine(tool): string;
```

Defined in: [core/messages/en.ts:61](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L61)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tool` | `string` |

#### Returns

`string`

***

### turns()

```ts
turns(count): string;
```

Defined in: [core/messages/en.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L16)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### unknownCommand()

```ts
unknownCommand(command): string;
```

Defined in: [core/messages/en.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L30)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `command` | `string` |

#### Returns

`string`

***

### workedFor()

```ts
workedFor(seconds): string;
```

Defined in: [core/messages/en.ts:15](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L15)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seconds` | `number` |

#### Returns

`string`
