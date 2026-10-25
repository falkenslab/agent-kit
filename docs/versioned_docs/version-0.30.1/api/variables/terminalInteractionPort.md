# Variable: terminalInteractionPort

```ts
const terminalInteractionPort: InteractionPort;
```

Defined in: [tui/terminalInteraction.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/tui/terminalInteraction.ts#L89)

The default `InteractionPort`, installed by the package entry point: prints the
checkpoint and reads the answer on the terminal, on the chat's own readline when one is
registered via `setSharedReadline()`. Without a TTY it prints nothing and never answers.
