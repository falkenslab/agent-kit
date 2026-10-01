---
sidebar_position: 4
title: Manual intervention
description: Let the agent pause until a person does something by hand, such as logging in.
---

# Manual intervention

Some steps an agent can't or shouldn't do: log in with credentials it doesn't have, solve a captcha, approve a two-factor prompt on a phone. The manual intervention checkpoint lets it stop until a person has done it by hand in the interface the agent drives (a browser window, say), and then continue.

## Opting in

There are no default texts: what counts as a manual intervention is entirely your domain's. Setting `manualInterventionTexts` in the spec is what registers the tool (outside `autonomous` mode):

```ts
const spec: AgentSpec<Config> = {
  // …
  manualInterventionTexts: {
    toolDescription:
      "Call this when you need to log in and can't: no credentials, a failed login, a captcha or a second factor. " +
      "A person will log in by hand in the browser window you're driving. Call it, wait, then check the page.",
    confirmedMessage: "The person says they're done. Reload the page and check you're logged in before continuing.",
    checkpointTitle: "Log in by hand",
    checkpointLines: [
      "The agent needs you to log in in the browser window it opened.",
      "Log in there, then confirm here.",
    ],
    checkpointQuestion: "Press Enter once you've logged in: ",
  },
};
```

| Field | Shown to | Purpose |
| --- | --- | --- |
| `toolDescription` | the model | When to call `request_manual_login`. |
| `confirmedMessage` | the model | What the tool returns once the person confirms. |
| `checkpointTitle`, `checkpointLines` | the person | The checkpoint's title and details. |
| `checkpointQuestion` | the person | The question in the plain terminal (optional). |

The tool is `mcp__manualLogin__request_manual_login`, with no parameters.

## What the person sees

In the Ink chat, a panel with your title and lines and a single choice, **1. Done, continue**. In the plain terminal, the lines and your question. The response file answers it too: any content counts as done.

## Building it yourself

```ts
import { createManualLoginServer } from "@falkenslab/agent-kit";

mcpServers: { manualLogin: createManualLoginServer(runDir, texts) },
```

And from your own code, `askForManualIntervention(runDir, { title, lines, question })` waits the same way.
