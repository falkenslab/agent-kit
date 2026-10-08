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
};
```

Defined in: [chat/chatController.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L91)

What a checkpoint asks: an approval, a confirmation after a manual step, free text, or a choice.
