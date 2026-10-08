# Interface: Messages

Defined in: [core/messages/en.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L11)

Every text the kit shows a person, in one language. Texts for the model (tool
descriptions, hook deny reasons, the knowledge base's prompt section) aren't here: they
stay in English whatever the language.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-answeredbyfile"></a> `answeredByFile` | `string` | - | [core/messages/en.ts:72](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L72) |
| <a id="property-approvaltitle"></a> `approvalTitle` | `string` | - | [core/messages/en.ts:77](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L77) |
| <a id="property-approved"></a> `approved` | `string` | - | [core/messages/en.ts:68](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L68) |
| <a id="property-auth"></a> `auth` | `object` | - | [core/messages/en.ts:134](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L134) |
| `auth.browserWillOpen` | `string` | - | [core/messages/en.ts:140](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L140) |
| `auth.cantStart` | `string` | - | [core/messages/en.ts:138](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L138) |
| `auth.generated` | `string` | - | [core/messages/en.ts:141](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L141) |
| `auth.generateQuestion` | `string` | - | [core/messages/en.ts:137](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L137) |
| `auth.generatingHeading` | `string` | - | [core/messages/en.ts:139](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L139) |
| `auth.noToken` | `string` | - | [core/messages/en.ts:135](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L135) |
| `auth.noTokenDetail` | `string` | - | [core/messages/en.ts:136](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L136) |
| <a id="property-cancelplan"></a> `cancelPlan` | `string` | - | [core/messages/en.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L93) |
| <a id="property-commandextensions"></a> `commandExtensions` | `string` | - | [core/messages/en.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L42) |
| <a id="property-commandplan"></a> `commandPlan` | `string` | - | [core/messages/en.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L41) |
| <a id="property-commandresume"></a> `commandResume` | `string` | What the chat's own commands do, for a view that lists them. | [core/messages/en.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L40) |
| <a id="property-currentrun"></a> `currentRun` | `string` | - | [core/messages/en.ts:52](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L52) |
| <a id="property-done"></a> `done` | `string` | - | [core/messages/en.ts:71](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L71) |
| <a id="property-donecontinue"></a> `doneContinue` | `string` | - | [core/messages/en.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L67) |
| <a id="property-error"></a> `error` | `string` | - | [core/messages/en.ts:101](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L101) |
| <a id="property-esctointerrupt"></a> `escToInterrupt` | `string` | - | [core/messages/en.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L14) |
| <a id="property-extensionscantreopen"></a> `extensionsCantReopen` | `string` | - | [core/messages/en.ts:51](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L51) |
| <a id="property-extensionsinstalled"></a> `extensionsInstalled` | `string` | - | [core/messages/en.ts:47](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L47) |
| <a id="property-extensionsnone"></a> `extensionsNone` | `string` | - | [core/messages/en.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L45) |
| <a id="property-extensionsusage"></a> `extensionsUsage` | `string` | - | [core/messages/en.ts:50](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L50) |
| <a id="property-filerequestquestion"></a> `fileRequestQuestion` | `string` | - | [core/messages/en.ts:83](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L83) |
| <a id="property-filerequesttitle"></a> `fileRequestTitle` | `string` | - | [core/messages/en.ts:82](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L82) |
| <a id="property-interrupted"></a> `interrupted` | `string` | - | [core/messages/en.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L28) |
| <a id="property-keepplanning"></a> `keepPlanning` | `string` | - | [core/messages/en.ts:92](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L92) |
| <a id="property-labels"></a> `labels` | `object` | - | [core/messages/en.ts:108](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L108) |
| `labels.aFile` | `string` | - | [core/messages/en.ts:116](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L116) |
| `labels.aPage` | `string` | - | [core/messages/en.ts:124](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L124) |
| `labels.aSkill` | `string` | - | [core/messages/en.ts:127](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L127) |
| `labels.aSubagent` | `string` | - | [core/messages/en.ts:122](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L122) |
| `labels.calculatingDates` | `string` | - | [core/messages/en.ts:112](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L112) |
| `labels.checkingTime` | `string` | - | [core/messages/en.ts:111](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L111) |
| `labels.presentingPlan` | `string` | - | [core/messages/en.ts:130](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L130) |
| `labels.updatingTasks` | `string` | - | [core/messages/en.ts:128](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L128) |
| `labels.waitingManual` | `string` | - | [core/messages/en.ts:110](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L110) |
| `labels.applyingSkill` | `string` | - | [core/messages/en.ts:126](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L126) |
| `labels.askingApproval` | `string` | - | [core/messages/en.ts:109](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L109) |
| `labels.askingHuman` | `string` | - | [core/messages/en.ts:129](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L129) |
| `labels.delegating` | `string` | - | [core/messages/en.ts:120](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L120) |
| `labels.delegatingTask` | `string` | - | [core/messages/en.ts:121](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L121) |
| `labels.editing` | `string` | - | [core/messages/en.ts:115](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L115) |
| `labels.fetching` | `string` | - | [core/messages/en.ts:123](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L123) |
| `labels.findingFiles` | `string` | - | [core/messages/en.ts:117](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L117) |
| `labels.reading` | `string` | - | [core/messages/en.ts:113](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L113) |
| `labels.running` | `string` | - | [core/messages/en.ts:119](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L119) |
| `labels.searchingContents` | `string` | - | [core/messages/en.ts:118](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L118) |
| `labels.searchingWeb` | `string` | - | [core/messages/en.ts:125](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L125) |
| `labels.writing` | `string` | - | [core/messages/en.ts:114](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L114) |
| <a id="property-no"></a> `no` | `string` | - | [core/messages/en.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L65) |
| <a id="property-noanswer"></a> `noAnswer` | `string` | - | [core/messages/en.ts:79](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L79) |
| <a id="property-noearlierruns"></a> `noEarlierRuns` | `string` | - | [core/messages/en.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L38) |
| <a id="property-nooutput"></a> `noOutput` | `string` | - | [core/messages/en.ts:100](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L100) |
| <a id="property-nothingtocopy"></a> `nothingToCopy` | `string` | - | [core/messages/en.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L30) |
| <a id="property-otheroption"></a> `otherOption` | `string` | - | [core/messages/en.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L87) |
| <a id="property-othertools"></a> `otherTools` | [`ToolPhrase`](../type-aliases/ToolPhrase.md) | - | [core/messages/en.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L99) |
| <a id="property-plancommentquestion"></a> `planCommentQuestion` | `string` | - | [core/messages/en.ts:94](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L94) |
| <a id="property-plantitle"></a> `planTitle` | `string` | - | [core/messages/en.ts:90](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L90) |
| <a id="property-proceed"></a> `proceed` | `string` | - | [core/messages/en.ts:63](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L63) |
| <a id="property-proposedaction"></a> `proposedAction` | `string` | - | [core/messages/en.ts:74](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L74) |
| <a id="property-questiontitle"></a> `questionTitle` | `string` | - | [core/messages/en.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L89) |
| <a id="property-rejected"></a> `rejected` | `string` | - | [core/messages/en.ts:69](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L69) |
| <a id="property-resumehint"></a> `resumeHint` | `string` | - | [core/messages/en.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L36) |
| <a id="property-resumequestion"></a> `resumeQuestion` | `string` | - | [core/messages/en.ts:37](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L37) |
| <a id="property-resumetitle"></a> `resumeTitle` | `string` | - | [core/messages/en.ts:35](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L35) |
| <a id="property-retirepagetitle"></a> `retirePageTitle` | `string` | - | [core/messages/en.ts:85](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L85) |
| <a id="property-retiretitle"></a> `retireTitle` | `string` | - | [core/messages/en.ts:84](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L84) |
| <a id="property-runplan"></a> `runPlan` | `string` | - | [core/messages/en.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L91) |
| <a id="property-shortcuts"></a> `shortcuts` | `string`[] | - | [core/messages/en.ts:59](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L59) |
| <a id="property-stop"></a> `stop` | `string` | - | [core/messages/en.ts:66](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L66) |
| <a id="property-stopped"></a> `stopped` | `string` | - | [core/messages/en.ts:70](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L70) |
| <a id="property-suggestionkey"></a> `suggestionKey` | `string` | - | [core/messages/en.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L56) |
| <a id="property-switchmodekey"></a> `switchModeKey` | `string` | - | [core/messages/en.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L21) |
| <a id="property-terminalquestion"></a> `terminalQuestion` | `string` | - | [core/messages/en.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L73) |
| <a id="property-textanswerhint"></a> `textAnswerHint` | `string` | - | [core/messages/en.ts:80](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L80) |
| <a id="property-textanswerkeys"></a> `textAnswerKeys` | `string` | - | [core/messages/en.ts:81](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L81) |
| <a id="property-thinking"></a> `thinking` | `string` | - | [core/messages/en.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L13) |
| <a id="property-toolfailed"></a> `toolFailed` | `string` | A failed tool call when results are hidden (`toolDetail: "calls"`): no tool output, just that it failed. | [core/messages/en.ts:103](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L103) |
| <a id="property-toolphrases"></a> `toolPhrases` | `Record`\<`string`, [`ToolPhrase`](../type-aliases/ToolPhrase.md)\> | - | [core/messages/en.ts:98](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L98) |
| <a id="property-yes"></a> `yes` | `string` | - | [core/messages/en.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L64) |

## Methods

### choiceKeys()

```ts
choiceKeys(multiple): string;
```

Defined in: [core/messages/en.ts:88](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L88)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `multiple` | `boolean` |

#### Returns

`string`

***

### choiceQuestion()

```ts
choiceQuestion(multiple): string;
```

Defined in: [core/messages/en.ts:86](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L86)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `multiple` | `boolean` |

#### Returns

`string`

***

### context()

```ts
context(percent): string;
```

Defined in: [core/messages/en.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L19)

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

Defined in: [core/messages/en.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L24)

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

Defined in: [core/messages/en.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L29)

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

Defined in: [core/messages/en.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L105)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### extensionNotInstalled()

```ts
extensionNotInstalled(name): string;
```

Defined in: [core/messages/en.ts:49](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L49)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionOff()

```ts
extensionOff(name, reason): string;
```

Defined in: [core/messages/en.ts:46](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L46)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `reason` | `string` |

#### Returns

`string`

***

### extensionsRunning()

```ts
extensionsRunning(names): string;
```

Defined in: [core/messages/en.ts:44](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L44)

/extensions (#37): what the session runs with, what's off and why, and enabling or disabling one.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `names` | `string` |

#### Returns

`string`

***

### extensionToggled()

```ts
extensionToggled(name, enabled): string;
```

Defined in: [core/messages/en.ts:48](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L48)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `enabled` | `boolean` |

#### Returns

`string`

***

### linesBelow()

```ts
linesBelow(count): string;
```

Defined in: [core/messages/en.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L23)

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

Defined in: [core/messages/en.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L32)

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

Defined in: [core/messages/en.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L20)

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

Defined in: [core/messages/en.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L22)

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

Defined in: [core/messages/en.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L62)

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

Defined in: [core/messages/en.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L104)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### moreTodos()

```ts
moreTodos(count): string;
```

Defined in: [core/messages/en.ts:107](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L107)

Tasks of the task list left out of the view.

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

Defined in: [core/messages/en.ts:76](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L76)

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

Defined in: [core/messages/en.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L58)

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

Defined in: [core/messages/en.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L27)

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

Defined in: [core/messages/en.ts:53](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L53)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `date` | `string` |

#### Returns

`string`

***

### retireLines()

```ts
retireLines(
   source, 
   why, 
   reason, 
   replacedBy, 
   folder
): string[];
```

Defined in: [core/messages/en.ts:95](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L95)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |
| `why` | `"wrong"` \| `"replaced"` |
| `reason` | `string` |
| `replacedBy` | `string` \| `undefined` |
| `folder` | `string` |

#### Returns

`string`[]

***

### reverseSearch()

```ts
reverseSearch(query): string;
```

Defined in: [core/messages/en.ts:57](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L57)

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

Defined in: [core/messages/en.ts:78](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L78)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `summary` | `string` |

#### Returns

`string`

***

### tokens()

```ts
tokens(
   input, 
   output, 
   cached?
): string;
```

Defined in: [core/messages/en.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L18)

The session's input tokens: new ones, and those read again from the cache (if any).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` |
| `output` | `string` |
| `cached?` | `string` |

#### Returns

`string`

***

### toolLine()

```ts
toolLine(tool): string;
```

Defined in: [core/messages/en.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L75)

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

Defined in: [core/messages/en.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L31)

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
