# Interface: InteractionPort

Defined in: [core/interaction.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L30)

The UI side of a human-in-the-loop checkpoint: how a host shows the question and reads a
person's answer. `askForDecision()` races it against the response file, so a port only
covers the keyboard (or window) channel and never needs to know about the file.

A method that can't ask (no TTY, no window) returns a promise that never resolves, so the
file wins. `signal` aborts once the race is settled by the other channel; a port must
drop its question then and leave its UI usable.

Kept in `core/` so the checkpoints never depend on a terminal (ADR-001): the terminal
port lives in `tui/` and is installed by the package entry point; a non-terminal host
installs its own, or `null` to answer through the response file alone.

## Methods

### askChoice()?

```ts
optional askChoice(
   prompt, 
   choice, 
   signal
): Promise<string>;
```

Defined in: [core/interaction.ts:47](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L47)

A choice between options. Resolves to the raw answer: the chosen options' numbers
(1-based, comma-separated, "1" or "1,3") on the first line, and the person's own answer
("Other") on the lines after it, or alone. Optional: without it the kit asks through
`askDecision()`, with the options numbered in the prompt.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | [`ApprovalPrompt`](ApprovalPrompt.md) |
| `choice` | [`ChoiceSettings`](ChoiceSettings.md) |
| `signal` | `AbortSignal` |

#### Returns

`Promise`\<`string`\>

***

### askDecision()

```ts
askDecision(prompt, signal): Promise<string>;
```

Defined in: [core/interaction.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L32)

A step-gate or approval checkpoint; resolves to the raw answer ("", "y", "n", "q"...).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | [`ApprovalPrompt`](ApprovalPrompt.md) |
| `signal` | `AbortSignal` |

#### Returns

`Promise`\<`string`\>

***

### askManualIntervention()

```ts
askManualIntervention(prompt, signal): Promise<string>;
```

Defined in: [core/interaction.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L34)

Waits until the person confirms they intervened by hand (e.g. logged in).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | [`ApprovalPrompt`](ApprovalPrompt.md) |
| `signal` | `AbortSignal` |

#### Returns

`Promise`\<`string`\>

***

### askText()?

```ts
optional askText(prompt, signal): Promise<string>;
```

Defined in: [core/interaction.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L40)

A free-text answer (e.g. the path of a file the agent asked for), with case and spaces
kept; "" for none. Optional: without it the kit asks through `askDecision()`, whose
answer a plain terminal reads as text too.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `prompt` | [`ApprovalPrompt`](ApprovalPrompt.md) |
| `signal` | `AbortSignal` |

#### Returns

`Promise`\<`string`\>

***

### notify()

```ts
notify(message): void;
```

Defined in: [core/interaction.ts:49](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L49)

A one-way message for the person.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |

#### Returns

`void`
