/** True for the error @inquirer/prompts throws when the user cancels (Ctrl+C) a prompt. */
export function isExitPromptError(error: unknown): boolean {
  return error instanceof Error && error.name === "ExitPromptError";
}
