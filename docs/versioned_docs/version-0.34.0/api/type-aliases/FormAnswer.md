# Type Alias: FormAnswer

```ts
type FormAnswer = object;
```

Defined in: [core/elicitation.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L42)

The person's answer to a form: its values when accepted.

## Properties

### action

```ts
action: "accept" | "decline" | "cancel";
```

Defined in: [core/elicitation.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L43)

***

### content?

```ts
optional content?: Record<string, string | number | boolean | string[]>;
```

Defined in: [core/elicitation.ts:44](https://github.com/falkenslab/agent-kit/blob/main/src/core/elicitation.ts#L44)
