import type { ReactNode } from "react";
import { defaultTheme, extendTheme, ThemeProvider } from "@inkjs/ui";
import { inkColor } from "../theme.js";

/**
 * `@inkjs/ui`'s components in the kit's theme: the focused option of a `Select` (and its
 * `❯`) in the theme's `selection` color and bold, instead of the library's blue, which on
 * most dark terminals is a navy that barely shows.
 */
export function KitTheme({ children }: { children: ReactNode }) {
  const selection = inkColor("selection");
  const theme = extendTheme(defaultTheme, {
    components: {
      Select: {
        styles: {
          focusIndicator: () => ({ color: selection }),
          label: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) => ({
            color: isFocused ? selection : isSelected ? "green" : undefined,
            bold: isFocused,
          }),
        },
      },
    },
  });
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
