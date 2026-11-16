# Interface: WizardOptions

Defined in: [tui/ink/wizard.tsx:60](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L60)

Options of `runWizard()`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-language"></a> `language?` | `string` | The language of the kit's texts ("en", "es", "fr", "de"). `--language=<code>` on the command line wins; without either, the one `buildSessionOptions()` chose from `config.language`, or else the system's. | [tui/ink/wizard.tsx:76](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L76) |
| <a id="property-plain"></a> `plain?` | `boolean` | Use the plain @inquirer/prompts questions even on a TTY. | [tui/ink/wizard.tsx:64](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L64) |
| <a id="property-theme"></a> `theme?` | `Partial`\<[`Theme`](Theme.md)\> | Colors for the kit's roles (see `Theme`), on top of the kit's defaults: only the roles given change, e.g. `{ toolResult: "yellow", selection: "#00ff00" }`. One theme per process: without this option, the one already set stays. | [tui/ink/wizard.tsx:70](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L70) |
| <a id="property-title"></a> `title?` | `string` | Printed above the first question. | [tui/ink/wizard.tsx:62](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L62) |
