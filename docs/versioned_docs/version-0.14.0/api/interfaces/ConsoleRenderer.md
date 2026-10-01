# Interface: ConsoleRenderer

Defined in: [tui/consoleRenderer.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L20)

Prints `runQuery()`'s events as plain console lines (see `createConsoleRenderer()`).

## Extended by

- [`ProgressView`](ProgressView.md)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-atlinestart"></a> `atLineStart` | `readonly` | `boolean` | Whether the cursor sits at the start of a line (after anything ending in "\n"). | [tui/consoleRenderer.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L31) |

## Methods

### endLine()

```ts
endLine(): void;
```

Defined in: [tui/consoleRenderer.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L27)

Ends the current line, if the cursor isn't already at the start of one.

#### Returns

`void`

***

### render()

```ts
render(event): void;
```

Defined in: [tui/consoleRenderer.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L22)

Prints one normalized event from `runQuery()`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`AgentEvent`](../type-aliases/AgentEvent.md) |

#### Returns

`void`

***

### startTurn()

```ts
startTurn(): void;
```

Defined in: [tui/consoleRenderer.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L29)

Marks the start of a new turn, so the agent label is printed again before its text.

#### Returns

`void`

***

### write()

```ts
write(text): void;
```

Defined in: [tui/consoleRenderer.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L23)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

`void`

***

### writeLine()

```ts
writeLine(text): void;
```

Defined in: [tui/consoleRenderer.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L25)

Writes `text` on a line of its own: after ending the current line if needed.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

`void`
