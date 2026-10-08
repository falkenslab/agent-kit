# Type Alias: TranscriptEntry

```ts
type TranscriptEntry = 
  | {
  id: number;
  kind: "user";
  text: string;
}
  | {
  id: number;
  kind: "agent";
  text: string;
}
  | {
  calls: TranscriptCall[];
  id: number;
  kind: "tools";
}
  | {
  id: number;
  kind: "notice";
  text: string;
  tone: NoticeTone;
}
  | {
  id: number;
  kind: "turn-summary";
  seconds: number;
};
```

Defined in: [chat/chatController.ts:80](https://github.com/falkenslab/agent-kit/blob/main/src/chat/chatController.ts#L80)

One block of the conversation, as a view shows it.
