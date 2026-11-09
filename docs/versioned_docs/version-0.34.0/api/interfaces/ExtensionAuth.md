# Interface: ExtensionAuth

Defined in: [core/liveExtensions.ts:167](https://github.com/falkenslab/agent-kit/blob/main/src/core/liveExtensions.ts#L167)

Signing in to installed extensions' remote servers, and out (#61).

## Methods

### connected()

```ts
connected(name, timeoutMs?): Promise<boolean>;
```

Defined in: [core/liveExtensions.ts:177](https://github.com/falkenslab/agent-kit/blob/main/src/core/liveExtensions.ts#L177)

Whether all of `name`'s remote servers are connected, waiting up to `timeoutMs` for it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `timeoutMs?` | `number` |

#### Returns

`Promise`\<`boolean`\>

***

### needed()

```ts
needed(): Promise<string[]>;
```

Defined in: [core/liveExtensions.ts:169](https://github.com/falkenslab/agent-kit/blob/main/src/core/liveExtensions.ts#L169)

The running extensions whose remote servers need the person to sign in.

#### Returns

`Promise`\<`string`[]\>

***

### signIn()

```ts
signIn(name, callbackUrl?): Promise<SignIn>;
```

Defined in: [core/liveExtensions.ts:175](https://github.com/falkenslab/agent-kit/blob/main/src/core/liveExtensions.ts#L175)

Starts signing in to `name`'s servers that need it, giving the links to open: the SDK's CLI
waits for the browser at its localhost callback. With `callbackUrl` (the address the browser
ended on, pasted from another computer), finishes it instead, and reconnects.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `callbackUrl?` | `string` |

#### Returns

`Promise`\<[`SignIn`](../type-aliases/SignIn.md)\>

***

### signOut()

```ts
signOut(name): Promise<boolean>;
```

Defined in: [core/liveExtensions.ts:179](https://github.com/falkenslab/agent-kit/blob/main/src/core/liveExtensions.ts#L179)

Signs out of `name`'s remote servers; false when it can't be done here.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`Promise`\<`boolean`\>
