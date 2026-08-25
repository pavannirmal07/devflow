import type { DevTask } from "../types";

/**
 * Parses a PostgreSQL date-only string ("YYYY-MM-DD") into local calendar parts.
 * Prevents UTC midnight shifting bugs when instantiated via standard `new Date("YYYY-MM-DD")`.
 */
export function parseLocalDateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

/**
 * Normalizes a Date to local midnight (00:00:00.000).
 */
export function getLocalMidnight(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Converts a "YYYY-MM-DD" string into a Date at local midnight.
 */
export function getDueDateMidnight(dateStr: string): Date {
  const { year, month, day } = parseLocalDateParts(dateStr);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Returns the end of the current local week (Sunday at midnight 00:00:00.000)
 * using the Monday-Sunday week convention.
 */
export function getEndOfWeekMidnight(date: Date = new Date()): Date {
  const today = getLocalMidnight(date);
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilSunday, 0, 0, 0, 0);
}

/**
 * Checks if an incomplete task has a due date before today.
 * Completed tasks are NEVER overdue.
 */
export function isTaskOverdue(task: DevTask, now?: Date): boolean {
  if (!task.due_date || task.status === "completed") return false;
  const due = getDueDateMidnight(task.due_date);
  const today = getLocalMidnight(now);
  return due.getTime() < today.getTime();
}

/**
 * Checks if an incomplete task is due on the current local calendar day.
 * Completed tasks are excluded.
 */
export function isTaskDueToday(task: DevTask, now?: Date): boolean {
  if (!task.due_date || task.status === "completed") return false;
  const due = getDueDateMidnight(task.due_date);
  const today = getLocalMidnight(now);
  return due.getTime() === today.getTime();
}

/**
 * Checks if an incomplete task is due between today and the end of the current local week (Sunday).
 * Completed tasks are excluded.
 */
export function isTaskDueThisWeek(task: DevTask, now?: Date): boolean {
  if (!task.due_date || task.status === "completed") return false;
  const due = getDueDateMidnight(task.due_date);
  const today = getLocalMidnight(now);
  const sunday = getEndOfWeekMidnight(now);
  return due.getTime() >= today.getTime() && due.getTime() <= sunday.getTime();
}

/**
 * Classifies an incomplete task into its due-date intelligence category.
 * Completed tasks return "no_due_date" to avoid false alert triggers.
 */
export function getTaskDueDateCategory(
  task: DevTask,
  now?: Date
): "overdue" | "today" | "this_week" | "future" | "no_due_date" {
  if (!task.due_date || task.status === "completed") {
    return "no_due_date";
  }

  if (isTaskOverdue(task, now)) {
    return "overdue";
  }

  if (isTaskDueToday(task, now)) {
    return "today";
  }

  if (isTaskDueThisWeek(task, now)) {
    return "this_week";
  }

  return "future";
}

/**
 * Formats a "YYYY-MM-DD" string into a localized short date (e.g. "Aug 25").
 * Uses local calendar parts to avoid timezone shifting.
 */
export function formatDueDateSafe(dateStr: string): string {
  const { year, month, day } = parseLocalDateParts(dateStr);
  const date = new Date(year, month, day);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns a human-friendly relative due-date label based on intelligence category.
 */
export function formatDueRelative(task: DevTask, now?: Date): string {
  if (!task.due_date) return "";
  const cat = getTaskDueDateCategory(task, now);
  const formatted = formatDueDateSafe(task.due_date);

  if (cat === "overdue") {
    return `Overdue (${formatted})`;
  }
  if (cat === "today") {
    return "Due Today";
  }
  return `Due ${formatted}`;
}
