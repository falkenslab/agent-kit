# Type Alias: ChatEvent

```ts
type ChatEvent = 
  | {
  event: AgentEvent;
  type: "agent";
}
  | {
  text: string;
  type: "user";
}
  | {
  text: string;
  tone: NoticeTone;
  type: "notice";
}
  | {
  type: "turn-start";
}
  | {
  seconds: number;
  type: "turn-end";
}
  | {
  fromResume: boolean;
  messages: object[];
  type: "conversation";
  updatedAt: Date;
}
  | {
  mode: Mode;
  type: "mode";
}
  | {
  type: "session";
};
```

Defined in: [chat/chatController.ts:135](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L135)

What happens in the chat, in order, for a view that draws as it goes (a terminal).

## Union Members

### Type Literal

```ts
{
  event: AgentEvent;
  type: "agent";
}
```

***

### Type Literal

```ts
{
  text: string;
  type: "user";
}
```

***

### Type Literal

```ts
{
  text: string;
  tone: NoticeTone;
  type: "notice";
}
```

***

### Type Literal

```ts
{
  type: "turn-start";
}
```

***

### Type Literal

```ts
{
  seconds: number;
  type: "turn-end";
}
```

***

### Type Literal

```ts
{
  fromResume: boolean;
  messages: object[];
  type: "conversation";
  updatedAt: Date;
}
```

An earlier conversation to draw: the run's, at start or after `/resume`.

***

### Type Literal

```ts
{
  mode: Mode;
  type: "mode";
}
```

The mode changed (the person, or the agent leaving plan mode).

***

### Type Literal

```ts
{
  type: "session";
}
```

The session was opened again (resumed, or an extension enabled or disabled).
