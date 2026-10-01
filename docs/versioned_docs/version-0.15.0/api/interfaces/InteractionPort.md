# Interface: InteractionPort

Defined in: [core/interaction.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L22)

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

### askDecision()

```ts
askDecision(prompt, signal): Promise<string>;
```

Defined in: [core/interaction.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L24)

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

Defined in: [core/interaction.ts:26](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L26)

Waits until the person confirms they intervened by hand (e.g. logged in).

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

Defined in: [core/interaction.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L28)

A one-way message for the person.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |

#### Returns

`void`
