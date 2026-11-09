# Type Alias: SignIn

```ts
type SignIn = 
  | {
  status: "signed-in";
}
  | {
  links: object[];
  status: "open";
}
  | {
  reason: "not-running" | "not-remote" | "unsupported";
  status: "unavailable";
};
```

Defined in: [core/liveExtensions.ts:158](https://github.com/falkenslab/agent-kit/blob/main/src/core/liveExtensions.ts#L158)

Where signing in to an extension's remote servers stands (#61).

## Union Members

### Type Literal

```ts
{
  status: "signed-in";
}
```

Its servers are connected: nothing to sign in to.

***

### Type Literal

```ts
{
  links: object[];
  status: "open";
}
```

The links the person opens to sign in, one per server that needs it.

***

### Type Literal

```ts
{
  reason: "not-running" | "not-remote" | "unsupported";
  status: "unavailable";
}
```

It isn't running in this session, has no remote server, or the SDK can't sign in.
