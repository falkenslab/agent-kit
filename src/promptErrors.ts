/** true if the error comes from the user pressing Ctrl+C inside an @inquirer prompt. */
export function isExitPromptError(error: unknown): boolean {
  return error instanceof Error && error.name === "ExitPromptError";
}
