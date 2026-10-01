# Interface: ProgressView

Defined in: [tui/ink/progressView.tsx:44](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L44)

A one-shot run's live view: a console renderer drawn with Ink, plus `close()`.

## Extends

- [`ConsoleRenderer`](ConsoleRenderer.md)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-atlinestart"></a> `atLineStart` | `readonly` | `boolean` | Whether the cursor sits at the start of a line (after anything ending in "\n"). | [`ConsoleRenderer`](ConsoleRenderer.md).[`atLineStart`](ConsoleRenderer.md#property-atlinestart) | [tui/consoleRenderer.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L31) |

## Methods

### close()

```ts
close(): Promise<void>;
```

Defined in: [tui/ink/progressView.tsx:46](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/progressView.tsx#L46)

Removes the live area and restores the previous interaction port; await it before printing anything else.

#### Returns

`Promise`\<`void`\>

***

### endLine()

```ts
endLine(): void;
```

Defined in: [tui/consoleRenderer.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L27)

Ends the current line, if the cursor isn't already at the start of one.

#### Returns

`void`

#### Inherited from

[`ConsoleRenderer`](ConsoleRenderer.md).[`endLine`](ConsoleRenderer.md#endline)

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

#### Inherited from

[`ConsoleRenderer`](ConsoleRenderer.md).[`render`](ConsoleRenderer.md#render)

***

### startTurn()

```ts
startTurn(): void;
```

Defined in: [tui/consoleRenderer.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/tui/consoleRenderer.ts#L29)

Marks the start of a new turn, so the agent label is printed again before its text.

#### Returns

`void`

#### Inherited from

[`ConsoleRenderer`](ConsoleRenderer.md).[`startTurn`](ConsoleRenderer.md#startturn)

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

#### Inherited from

[`ConsoleRenderer`](ConsoleRenderer.md).[`write`](ConsoleRenderer.md#write)

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

#### Inherited from

[`ConsoleRenderer`](ConsoleRenderer.md).[`writeLine`](ConsoleRenderer.md#writeline)
