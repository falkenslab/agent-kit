import { chooseLanguage, takeLanguageWarnings } from "../core/messages/index.js";
import * as ui from "./ui.js";

/**
 * Chooses the kit's language for a terminal entry point (see messages/'s chooseLanguage())
 * and prints the warnings about unsupported codes not shown yet, or hands them to `show`.
 */
export function applyLanguage(option: string | undefined, show: (line: string) => void = (line) => console.warn(ui.warn(line))): void {
  chooseLanguage(option);
  for (const warning of takeLanguageWarnings()) show(warning);
}
