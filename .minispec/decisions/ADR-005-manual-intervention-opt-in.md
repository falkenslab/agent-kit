# ADR-005: Manual intervention is opt-in through its texts

## Decision

`request_manual_login` is only registered when `spec.manualInterventionTexts` is set (and the mode isn't `autonomous`). There is no generic fallback wording.

## Motivation

"A human can step into a live UI by hand" (a browser window) isn't a concept every agent has. An earlier version gated it on `headless: boolean` in `BaseSessionConfig`, which baked a browser assumption into the generic config and forced every consumer to answer a question with no referent.

## Consequences

An agent without such a UI never sets the texts and never gets the tool. The approval tool, by contrast, has default texts (`humanApprovalTexts`).
