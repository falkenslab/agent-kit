# Interface: ClaudeSignIn

Defined in: [core/claudeAuth.ts:77](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L77)

A sign-in in progress (`startClaudeSignIn()`): Claude Code's own `auth login`, which keeps the credentials itself.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-done"></a> `done` | `Promise`\<`boolean`\> | Once the binary has ended: whether the person is signed in (`claudeSignedIn()`). | [core/claudeAuth.ts:83](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L83) |
| <a id="property-url"></a> `url` | `Promise`\<`string` \| `undefined`\> | Anthropic's sign-in page, to show as a link in case the browser didn't open; `undefined` if the binary ended without printing one. | [core/claudeAuth.ts:79](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L79) |

## Methods

### cancel()

```ts
cancel(): void;
```

Defined in: [core/claudeAuth.ts:85](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L85)

Stops the sign-in; `done` then resolves with whether the person is signed in anyway.

#### Returns

`void`

***

### sendCode()

```ts
sendCode(code): void;
```

Defined in: [core/claudeAuth.ts:81](https://github.com/falkenslab/agent-kit/blob/main/src/core/claudeAuth.ts#L81)

The code Anthropic's page shows after signing in, when it shows one: handed to the binary, which waits for it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `code` | `string` |

#### Returns

`void`
