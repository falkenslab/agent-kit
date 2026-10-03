/**
 * The SDK's `TodoWrite` tool: the model keeps a task list on long jobs, sending the whole
 * list with every call (confirmed empirically: an `action` event whose input is
 * `{ todos: [{ content, status, activeForm }] }`, and a result that only says it was saved).
 * The chats show the list instead of the calls.
 */

export type TodoStatus = "pending" | "in_progress" | "completed";

/** One task: what to do, in the imperative ("Prepare the slides"), and while it's done ("Preparing the slides"). */
export interface Todo {
  content: string;
  status: TodoStatus;
  activeForm: string;
}

export const TODO_TOOL = "TodoWrite";

const STATUSES = new Set<string>(["pending", "in_progress", "completed"]);

/** The list in a `TodoWrite` call's input, or `null` if it isn't one. */
export function parseTodos(input: unknown): Todo[] | null {
  const todos = (input as { todos?: unknown } | null)?.todos;
  if (!Array.isArray(todos)) return null;
  return todos
    .filter((todo): todo is Record<string, unknown> => Boolean(todo) && typeof todo === "object")
    .map((todo) => ({
      content: String(todo.content ?? ""),
      status: (STATUSES.has(String(todo.status)) ? todo.status : "pending") as TodoStatus,
      activeForm: String(todo.activeForm ?? todo.content ?? ""),
    }));
}

/** Whether any task is still to do. */
export function hasOpenTodos(todos: readonly Todo[] | null): boolean {
  return Boolean(todos?.some((todo) => todo.status !== "completed"));
}

/** The tasks that started and the ones finished from `before` to `after`, matched by their text. */
export function todoChanges(before: readonly Todo[], after: readonly Todo[]): { started: Todo[]; completed: Todo[] } {
  const previous = new Map(before.map((todo) => [todo.content, todo.status]));
  return {
    started: after.filter((todo) => todo.status === "in_progress" && previous.get(todo.content) !== "in_progress"),
    completed: after.filter((todo) => todo.status === "completed" && previous.get(todo.content) !== "completed"),
  };
}
