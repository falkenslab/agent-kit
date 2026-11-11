# Interface: Messages

Defined in: [core/messages/en.ts:11](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L11)

Every text the kit shows a person, in one language. Texts for the model (tool
descriptions, hook deny reasons, the knowledge base's prompt section) aren't here: they
stay in English whatever the language.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-answeredbyfile"></a> `answeredByFile` | `string` | - | [core/messages/en.ts:152](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L152) |
| <a id="property-approvaltitle"></a> `approvalTitle` | `string` | - | [core/messages/en.ts:157](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L157) |
| <a id="property-approved"></a> `approved` | `string` | - | [core/messages/en.ts:148](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L148) |
| <a id="property-auth"></a> `auth` | `object` | - | [core/messages/en.ts:214](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L214) |
| `auth.browserWillOpen` | `string` | - | [core/messages/en.ts:220](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L220) |
| `auth.cantStart` | `string` | - | [core/messages/en.ts:218](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L218) |
| `auth.noClaude` | `string` | - | [core/messages/en.ts:223](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L223) |
| `auth.notCompleted` | `string` | - | [core/messages/en.ts:222](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L222) |
| `auth.notSignedIn` | `string` | - | [core/messages/en.ts:215](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L215) |
| `auth.notSignedInDetail` | `string` | - | [core/messages/en.ts:216](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L216) |
| `auth.signedIn` | `string` | - | [core/messages/en.ts:221](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L221) |
| `auth.signingInHeading` | `string` | - | [core/messages/en.ts:219](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L219) |
| `auth.signInQuestion` | `string` | - | [core/messages/en.ts:217](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L217) |
| <a id="property-cancelplan"></a> `cancelPlan` | `string` | - | [core/messages/en.ts:173](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L173) |
| <a id="property-commandextensions"></a> `commandExtensions` | `string` | - | [core/messages/en.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L42) |
| <a id="property-commandplan"></a> `commandPlan` | `string` | - | [core/messages/en.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L41) |
| <a id="property-commandresume"></a> `commandResume` | `string` | What the chat's own commands do, for a view that lists them. | [core/messages/en.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L40) |
| <a id="property-confirmanswers"></a> `confirmAnswers` | `object` | Its answers (#76): this call, this session, always, no, never. | [core/messages/en.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L99) |
| `confirmAnswers.always` | `string` | - | [core/messages/en.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L99) |
| `confirmAnswers.never` | `string` | - | [core/messages/en.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L99) |
| `confirmAnswers.no` | `string` | - | [core/messages/en.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L99) |
| `confirmAnswers.session` | `string` | - | [core/messages/en.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L99) |
| `confirmAnswers.yes` | `string` | - | [core/messages/en.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L99) |
| <a id="property-confirmnonekept"></a> `confirmNoneKept` | `string` | - | [core/messages/en.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L105) |
| <a id="property-currentrun"></a> `currentRun` | `string` | - | [core/messages/en.ts:132](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L132) |
| <a id="property-done"></a> `done` | `string` | - | [core/messages/en.ts:151](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L151) |
| <a id="property-donecontinue"></a> `doneContinue` | `string` | - | [core/messages/en.ts:147](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L147) |
| <a id="property-elicitagain"></a> `elicitAgain` | `string` | - | [core/messages/en.ts:121](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L121) |
| <a id="property-elicitquestion"></a> `elicitQuestion` | `string` | - | [core/messages/en.ts:120](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L120) |
| <a id="property-eliciturlquestion"></a> `elicitUrlQuestion` | `string` | - | [core/messages/en.ts:125](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L125) |
| <a id="property-error"></a> `error` | `string` | - | [core/messages/en.ts:181](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L181) |
| <a id="property-esctointerrupt"></a> `escToInterrupt` | `string` | - | [core/messages/en.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L14) |
| <a id="property-extensionisinstalled"></a> `extensionIsInstalled` | `string` | - | [core/messages/en.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L73) |
| <a id="property-extensionsbusy"></a> `extensionsBusy` | `string` | - | [core/messages/en.ts:116](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L116) |
| <a id="property-extensionscantreopen"></a> `extensionsCantReopen` | `string` | - | [core/messages/en.ts:59](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L59) |
| <a id="property-extensionsinstalled"></a> `extensionsInstalled` | `string` | - | [core/messages/en.ts:53](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L53) |
| <a id="property-extensionsnomatch"></a> `extensionsNoMatch` | `string` | The catalog in the chat (#56). | [core/messages/en.ts:72](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L72) |
| <a id="property-extensionsnone"></a> `extensionsNone` | `string` | - | [core/messages/en.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L45) |
| <a id="property-extensionsreloaded"></a> `extensionsReloaded` | `string` | - | [core/messages/en.ts:117](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L117) |
| <a id="property-extensionsuptodate"></a> `extensionsUpToDate` | `string` | - | [core/messages/en.ts:113](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L113) |
| <a id="property-extensionsusage"></a> `extensionsUsage` | `string` | - | [core/messages/en.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L58) |
| <a id="property-filerequestquestion"></a> `fileRequestQuestion` | `string` | - | [core/messages/en.ts:163](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L163) |
| <a id="property-filerequesttitle"></a> `fileRequestTitle` | `string` | - | [core/messages/en.ts:162](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L162) |
| <a id="property-interrupted"></a> `interrupted` | `string` | - | [core/messages/en.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L28) |
| <a id="property-keepplanning"></a> `keepPlanning` | `string` | - | [core/messages/en.ts:172](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L172) |
| <a id="property-labels"></a> `labels` | `object` | - | [core/messages/en.ts:188](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L188) |
| `labels.aFile` | `string` | - | [core/messages/en.ts:196](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L196) |
| `labels.aPage` | `string` | - | [core/messages/en.ts:204](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L204) |
| `labels.aSkill` | `string` | - | [core/messages/en.ts:207](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L207) |
| `labels.aSubagent` | `string` | - | [core/messages/en.ts:202](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L202) |
| `labels.calculatingDates` | `string` | - | [core/messages/en.ts:192](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L192) |
| `labels.checkingTime` | `string` | - | [core/messages/en.ts:191](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L191) |
| `labels.presentingPlan` | `string` | - | [core/messages/en.ts:210](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L210) |
| `labels.updatingTasks` | `string` | - | [core/messages/en.ts:208](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L208) |
| `labels.waitingManual` | `string` | - | [core/messages/en.ts:190](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L190) |
| `labels.applyingSkill` | `string` | - | [core/messages/en.ts:206](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L206) |
| `labels.askingApproval` | `string` | - | [core/messages/en.ts:189](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L189) |
| `labels.askingHuman` | `string` | - | [core/messages/en.ts:209](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L209) |
| `labels.delegating` | `string` | - | [core/messages/en.ts:200](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L200) |
| `labels.delegatingTask` | `string` | - | [core/messages/en.ts:201](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L201) |
| `labels.editing` | `string` | - | [core/messages/en.ts:195](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L195) |
| `labels.fetching` | `string` | - | [core/messages/en.ts:203](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L203) |
| `labels.findingFiles` | `string` | - | [core/messages/en.ts:197](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L197) |
| `labels.reading` | `string` | - | [core/messages/en.ts:193](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L193) |
| `labels.running` | `string` | - | [core/messages/en.ts:199](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L199) |
| `labels.searchingContents` | `string` | - | [core/messages/en.ts:198](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L198) |
| `labels.searchingWeb` | `string` | - | [core/messages/en.ts:205](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L205) |
| `labels.writing` | `string` | - | [core/messages/en.ts:194](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L194) |
| <a id="property-no"></a> `no` | `string` | - | [core/messages/en.ts:145](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L145) |
| <a id="property-noanswer"></a> `noAnswer` | `string` | - | [core/messages/en.ts:159](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L159) |
| <a id="property-noearlierruns"></a> `noEarlierRuns` | `string` | - | [core/messages/en.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L38) |
| <a id="property-nooutput"></a> `noOutput` | `string` | - | [core/messages/en.ts:180](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L180) |
| <a id="property-nothingtocopy"></a> `nothingToCopy` | `string` | - | [core/messages/en.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L30) |
| <a id="property-optiondefault"></a> `optionDefault` | `string` | - | [core/messages/en.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L65) |
| <a id="property-optionnotset"></a> `optionNotSet` | `string` | - | [core/messages/en.ts:63](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L63) |
| <a id="property-optionrequired"></a> `optionRequired` | `string` | - | [core/messages/en.ts:66](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L66) |
| <a id="property-optionsecretset"></a> `optionSecretSet` | `string` | - | [core/messages/en.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L64) |
| <a id="property-otheroption"></a> `otherOption` | `string` | - | [core/messages/en.ts:167](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L167) |
| <a id="property-othertools"></a> `otherTools` | [`ToolPhrase`](../type-aliases/ToolPhrase.md) | - | [core/messages/en.ts:179](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L179) |
| <a id="property-plancommentquestion"></a> `planCommentQuestion` | `string` | - | [core/messages/en.ts:174](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L174) |
| <a id="property-plantitle"></a> `planTitle` | `string` | - | [core/messages/en.ts:170](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L170) |
| <a id="property-proceed"></a> `proceed` | `string` | - | [core/messages/en.ts:143](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L143) |
| <a id="property-proposedaction"></a> `proposedAction` | `string` | - | [core/messages/en.ts:154](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L154) |
| <a id="property-questiontitle"></a> `questionTitle` | `string` | - | [core/messages/en.ts:169](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L169) |
| <a id="property-rejected"></a> `rejected` | `string` | - | [core/messages/en.ts:149](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L149) |
| <a id="property-resumehint"></a> `resumeHint` | `string` | - | [core/messages/en.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L36) |
| <a id="property-resumequestion"></a> `resumeQuestion` | `string` | - | [core/messages/en.ts:37](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L37) |
| <a id="property-resumetitle"></a> `resumeTitle` | `string` | - | [core/messages/en.ts:35](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L35) |
| <a id="property-retirepagetitle"></a> `retirePageTitle` | `string` | - | [core/messages/en.ts:165](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L165) |
| <a id="property-retiretitle"></a> `retireTitle` | `string` | - | [core/messages/en.ts:164](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L164) |
| <a id="property-runplan"></a> `runPlan` | `string` | - | [core/messages/en.ts:171](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L171) |
| <a id="property-shortcuts"></a> `shortcuts` | `string`[] | - | [core/messages/en.ts:139](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L139) |
| <a id="property-stop"></a> `stop` | `string` | - | [core/messages/en.ts:146](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L146) |
| <a id="property-stopped"></a> `stopped` | `string` | - | [core/messages/en.ts:150](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L150) |
| <a id="property-suggestionkey"></a> `suggestionKey` | `string` | - | [core/messages/en.ts:136](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L136) |
| <a id="property-switchmodekey"></a> `switchModeKey` | `string` | - | [core/messages/en.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L21) |
| <a id="property-terminalquestion"></a> `terminalQuestion` | `string` | - | [core/messages/en.ts:153](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L153) |
| <a id="property-textanswerhint"></a> `textAnswerHint` | `string` | - | [core/messages/en.ts:160](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L160) |
| <a id="property-textanswerkeys"></a> `textAnswerKeys` | `string` | - | [core/messages/en.ts:161](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L161) |
| <a id="property-thinking"></a> `thinking` | `string` | - | [core/messages/en.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L13) |
| <a id="property-toolfailed"></a> `toolFailed` | `string` | A failed tool call when results are hidden (`toolDetail: "calls"`): no tool output, just that it failed. | [core/messages/en.ts:183](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L183) |
| <a id="property-toolphrases"></a> `toolPhrases` | `Record`\<`string`, [`ToolPhrase`](../type-aliases/ToolPhrase.md)\> | - | [core/messages/en.ts:178](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L178) |
| <a id="property-trustbody"></a> `trustBody` | `string` | - | [core/messages/en.ts:128](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L128) |
| <a id="property-trustdeclined"></a> `trustDeclined` | `string` | - | [core/messages/en.ts:130](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L130) |
| <a id="property-trustquestion"></a> `trustQuestion` | `string` | - | [core/messages/en.ts:129](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L129) |
| <a id="property-trusttitle"></a> `trustTitle` | `string` | A workspace's extensions to trust (#57). | [core/messages/en.ts:127](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L127) |
| <a id="property-yes"></a> `yes` | `string` | - | [core/messages/en.ts:144](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L144) |

## Methods

### capabilityToolsMissing()

```ts
capabilityToolsMissing(tools): string;
```

Defined in: [core/messages/en.ts:50](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L50)

A capability's tools its server doesn't offer in this session.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tools` | `string` |

#### Returns

`string`

***

### capabilityUnavailable()

```ts
capabilityUnavailable(label, reason): string;
```

Defined in: [core/messages/en.ts:52](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L52)

A capability that isn't available on this computer (#63), with why (in English, as every reason).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `label` | `string` |
| `reason` | `string` |

#### Returns

`string`

***

### choiceKeys()

```ts
choiceKeys(multiple): string;
```

Defined in: [core/messages/en.ts:168](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L168)

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

Defined in: [core/messages/en.ts:166](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L166)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `multiple` | `boolean` |

#### Returns

`string`

***

### confirmKept()

```ts
confirmKept(tool, answer): string;
```

Defined in: [core/messages/en.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L104)

A kept answer about one of its tools.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tool` | `string` |
| `answer` | `"always"` \| `"never"` |

#### Returns

`string`

***

### connectorsAllowed()

```ts
connectorsAllowed(names): string;
```

Defined in: [core/messages/en.ts:107](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L107)

In /extensions: the claude.ai connectors let in (#70).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `names` | `string` |

#### Returns

`string`

***

### connectorsMissing()

```ts
connectorsMissing(names): string;
```

Defined in: [core/messages/en.ts:111](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L111)

In /extensions: connectors the agent asked for that the account hasn't.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `names` | `string` |

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

Defined in: [core/messages/en.ts:185](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L185)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### elicitNotANumber()

```ts
elicitNotANumber(text): string;
```

Defined in: [core/messages/en.ts:122](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L122)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

`string`

***

### elicitOutOfRange()

```ts
elicitOutOfRange(minimum?, maximum?): string;
```

Defined in: [core/messages/en.ts:123](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L123)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `minimum?` | `number` |
| `maximum?` | `number` |

#### Returns

`string`

***

### elicitTitle()

```ts
elicitTitle(server): string;
```

Defined in: [core/messages/en.ts:119](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L119)

MCP elicitation (#58): a server asking the person for something.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `server` | `string` |

#### Returns

`string`

***

### elicitUrlTitle()

```ts
elicitUrlTitle(server): string;
```

Defined in: [core/messages/en.ts:124](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L124)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `server` | `string` |

#### Returns

`string`

***

### extensionAlreadySignedIn()

```ts
extensionAlreadySignedIn(name): string;
```

Defined in: [core/messages/en.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L91)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionCan()

```ts
extensionCan(name): string;
```

Defined in: [core/messages/en.ts:48](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L48)

Before an active extension's capabilities (#62), one per line after it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionConfirm()

```ts
extensionConfirm(spec, marketplace): string;
```

Defined in: [core/messages/en.ts:115](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L115)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | `string` |
| `marketplace` | `string` |

#### Returns

`string`

***

### extensionConfirmOff()

```ts
extensionConfirmOff(name): string;
```

Defined in: [core/messages/en.ts:102](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L102)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionConfirmOn()

```ts
extensionConfirmOn(name): string;
```

Defined in: [core/messages/en.ts:101](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L101)

In /extensions config: whether its tools ask in guided mode, before the answers kept.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionInstalled()

```ts
extensionInstalled(name): string;
```

Defined in: [core/messages/en.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L75)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionLacks()

```ts
extensionLacks(name, what): string;
```

Defined in: [core/messages/en.ts:77](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L77)

After installing: a program it needs that this computer lacks (#63); `what` is the reason, in English.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `what` | `string` |

#### Returns

`string`

***

### extensionNeedsSignIn()

```ts
extensionNeedsSignIn(name): string;
```

Defined in: [core/messages/en.ts:81](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L81)

In /extensions: a running extension whose remote server needs the person to sign in.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionNoOptions()

```ts
extensionNoOptions(name): string;
```

Defined in: [core/messages/en.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L62)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionNotInstalled()

```ts
extensionNotInstalled(name): string;
```

Defined in: [core/messages/en.ts:57](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L57)

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

### extensionOptions()

```ts
extensionOptions(name): string;
```

Defined in: [core/messages/en.ts:61](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L61)

An installed extension's options in the chat (#55).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionOptionsSaved()

```ts
extensionOptionsSaved(name): string;
```

Defined in: [core/messages/en.ts:68](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L68)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionReconfiguredReopen()

```ts
extensionReconfiguredReopen(name): string;
```

Defined in: [core/messages/en.ts:70](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L70)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionRemoved()

```ts
extensionRemoved(name, withData): string;
```

Defined in: [core/messages/en.ts:114](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L114)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `withData` | `boolean` |

#### Returns

`string`

***

### extensionRestarted()

```ts
extensionRestarted(name): string;
```

Defined in: [core/messages/en.ts:69](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L69)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionSignedIn()

```ts
extensionSignedIn(name): string;
```

Defined in: [core/messages/en.ts:88](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L88)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionSignedOut()

```ts
extensionSignedOut(name): string;
```

Defined in: [core/messages/en.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L93)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionSignInOpen()

```ts
extensionSignInOpen(name): string;
```

Defined in: [core/messages/en.ts:84](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L84)

Before the sign-in link, on its own line next (#72): when the browser couldn't be opened, and when it was.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionSignInOpened()

```ts
extensionSignInOpened(name): string;
```

Defined in: [core/messages/en.ts:85](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L85)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionSignInPaste()

```ts
extensionSignInPaste(name): string;
```

Defined in: [core/messages/en.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L87)

How to finish signing in from another computer.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionSignInUnavailable()

```ts
extensionSignInUnavailable(name): string;
```

Defined in: [core/messages/en.ts:92](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L92)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`string`

***

### extensionSignInWaiting()

```ts
extensionSignInWaiting(name): string;
```

Defined in: [core/messages/en.ts:90](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L90)

Signing in hasn't finished after a while.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

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

### extensionSwitched()

```ts
extensionSwitched(name, enabled): string;
```

Defined in: [core/messages/en.ts:55](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L55)

An installed extension turned off or on in the running session (#49).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `enabled` | `boolean` |

#### Returns

`string`

***

### extensionTalksTo()

```ts
extensionTalksTo(name, hosts): string;
```

Defined in: [core/messages/en.ts:79](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L79)

After installing one with remote servers (#61): the hosts it talks to.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `hosts` | `string` |

#### Returns

`string`

***

### extensionToggled()

```ts
extensionToggled(name, enabled): string;
```

Defined in: [core/messages/en.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L56)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `enabled` | `boolean` |

#### Returns

`string`

***

### extensionUpdateAvailable()

```ts
extensionUpdateAvailable(installed): string;
```

Defined in: [core/messages/en.ts:74](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L74)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `installed` | `string` |

#### Returns

`string`

***

### extensionUpdated()

```ts
extensionUpdated(
   name, 
   from, 
   to
): string;
```

Defined in: [core/messages/en.ts:112](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L112)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `from` | `string` |
| `to` | `string` |

#### Returns

`string`

***

### guidedTitle()

```ts
guidedTitle(extension): string;
```

Defined in: [core/messages/en.ts:97](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L97)

Guided mode's question before an installed extension's tool that changes things (#74): its title.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `extension` | `string` |

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

Defined in: [core/messages/en.ts:142](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L142)

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

Defined in: [core/messages/en.ts:184](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L184)

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

Defined in: [core/messages/en.ts:187](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L187)

Tasks of the task list left out of the view.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`string`

***

### optionSensitiveInChat()

```ts
optionSensitiveInChat(key, name): string;
```

Defined in: [core/messages/en.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L67)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `name` | `string` |

#### Returns

`string`

***

### parametersLine()

```ts
parametersLine(parameters): string;
```

Defined in: [core/messages/en.ts:156](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L156)

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

Defined in: [core/messages/en.ts:138](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L138)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `number` |
| `extraLines` | `number` |

#### Returns

`string`

***

### projectServersDuplicated()

```ts
projectServersDuplicated(file, servers): string;
```

Defined in: [core/messages/en.ts:109](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L109)

In /extensions: the project's .mcp.json servers left out because an extension's duplicates them (#83).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `file` | `string` |
| `servers` | `string` |

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

### remoteCallTitle()

```ts
remoteCallTitle(destination): string;
```

Defined in: [core/messages/en.ts:95](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L95)

Before a call to a remote MCP server, when the agent asks first (#70): where it goes.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `destination` | `string` |

#### Returns

`string`

***

### resumed()

```ts
resumed(date): string;
```

Defined in: [core/messages/en.ts:133](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L133)

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

Defined in: [core/messages/en.ts:175](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L175)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |
| `why` | `"replaced"` \| `"wrong"` |
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

Defined in: [core/messages/en.ts:137](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L137)

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

Defined in: [core/messages/en.ts:158](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L158)

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

Defined in: [core/messages/en.ts:155](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L155)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tool` | `string` |

#### Returns

`string`

***

### trustGiven()

```ts
trustGiven(names): string;
```

Defined in: [core/messages/en.ts:131](https://github.com/falkenslab/agent-kit/blob/main/src/core/messages/en.ts#L131)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `names` | `string` |

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
