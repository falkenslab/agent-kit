# Type Alias: ThemeColor

```ts
type ThemeColor = string | ((text) => string);
```

Defined in: [tui/theme.ts:9](https://github.com/falkenslab/agent-kit/blob/main/src/tui/theme.ts#L9)

A color for one role of the theme: a color name (`"gray"`, `"cyanBright"`: picocolors' and
Ink's names), a hex (`"#ff8800"`), or a function that styles the text itself (bold, a
background...). Roles drawn by Ink props (`border`, `selection`, the panels' `accent`) need
a name or a hex: a function there falls back to the default color.
