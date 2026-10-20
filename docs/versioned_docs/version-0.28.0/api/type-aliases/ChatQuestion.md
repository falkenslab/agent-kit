# Type Alias: ChatQuestion

```ts
type ChatQuestion = 
  | {
  kind: "decision" | "manual" | "text";
  prompt: ApprovalPrompt;
}
  | {
  choice: ChoiceSettings;
  kind: "choice";
  prompt: ApprovalPrompt;
}
  | {
  form: FormRequest;
  kind: "form";
  prompt: ApprovalPrompt;
};
```

Defined in: [chat/chatController.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L104)

What a checkpoint asks: an approval, a confirmation after a manual step, free text, or a choice.

## Union Members

### Type Literal

```ts
{
  kind: "decision" | "manual" | "text";
  prompt: ApprovalPrompt;
}
```

***

### Type Literal

```ts
{
  choice: ChoiceSettings;
  kind: "choice";
  prompt: ApprovalPrompt;
}
```

***

### Type Literal

```ts
{
  form: FormRequest;
  kind: "form";
  prompt: ApprovalPrompt;
}
```

A form an MCP server asks for (#58): answered with `answer(id, JSON.stringify({ action, content }))`.
