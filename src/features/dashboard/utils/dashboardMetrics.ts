import type { DevSession } from "../../sessions/types";
import type { DevTask, TaskSubtask, TaskTimeStats } from "../../tasks/types";
import type { TaskGitHubLink } from "../../github/types";
import { getLocalMidnight, isTaskDueToday, isTaskOverdue } from "../../tasks/utils/dueDate";
import { computeSessionDuration } from "../../tasks/utils/duration";
import type { DashboardAgendaTask, DashboardMetrics } from "../types";

/**
 * Returns Monday midnight (00:00:00.000) of the current local week.
 */
export function getStartOfWeekMidnight(date: Date = new Date()): Date {
  const today = getLocalMidnight(date);
  const day = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? 6 : day - 1;
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday, 0, 0, 0, 0);
}

/**
 * Derives aggregate developer metrics for today and this week from in-memory arrays.
 */
export function deriveDashboardMetrics(
  sessions: DevSession[],
  tasks: DevTask[],
  activeSession?: DevSession | null,
  dailyFocusGoalSeconds = 4 * 3600,
  now: Date = new Date()
): DashboardMetrics {
  const todayMidnight = getLocalMidnight(now);
  const startOfWeekMidnight = getStartOfWeekMidnight(now);

  const todayMidnightMs = todayMidnight.getTime();
  const startOfWeekMidnightMs = startOfWeekMidnight.getTime();

  let todayFocusSeconds = 0;
  let weekFocusSeconds = 0;
  let todayCompletedSessionsCount = 0;

  for (const s of sessions) {
    const startedAtMs = new Date(s.started_at).getTime();

    if (s.status === "completed") {
      const dur = s.duration_seconds ?? s.accumulated_seconds ?? 0;
      if (startedAtMs >= todayMidnightMs) {
        todayFocusSeconds += dur;
        todayCompletedSessionsCount += 1;
      }
      if (startedAtMs >= startOfWeekMidnightMs) {
        weekFocusSeconds += dur;
      }
    }
  }

  // Factor in active / paused live session if active
  if (activeSession) {
    const activeDur = computeSessionDuration(activeSession);
    const activeStartMs = new Date(activeSession.started_at).getTime();


    if (activeStartMs >= todayMidnightMs) {
      todayFocusSeconds += activeDur;
    }
    if (activeStartMs >= startOfWeekMidnightMs) {
      weekFocusSeconds += activeDur;
    }
  }

  let todayCompletedTasksCount = 0;
  let activeTasksCount = 0;
  let overdueTasksCount = 0;
  let dueTodayTasksCount = 0;

  for (const t of tasks) {
    if (t.status === "completed") {
      const updatedMs = new Date(t.updated_at).getTime();
      if (updatedMs >= todayMidnightMs) {
        todayCompletedTasksCount += 1;
      }
    } else {
      activeTasksCount += 1;
      if (isTaskOverdue(t, now)) {
        overdueTasksCount += 1;
      } else if (isTaskDueToday(t, now)) {
        dueTodayTasksCount += 1;
      }
    }
  }

  return {
    todayFocusSeconds,
    weekFocusSeconds,
    todayCompletedSessionsCount,
    todayCompletedTasksCount,
    activeTasksCount,
    overdueTasksCount,
    dueTodayTasksCount,
    dailyFocusGoalSeconds,
  };
}

/**
 * Derives the prioritized Focus Agenda tasks for today:
 * 1. Overdue incomplete tasks
 * 2. Due today incomplete tasks
 * 3. In-progress High / Critical priority tasks
 */
export function deriveDashboardAgenda(
  tasks: DevTask[],
  projectMap: Map<string, { name: string; color: string | null }>,
  githubLinksMap: Record<string, TaskGitHubLink[]>,
  taskTimeMap: Record<string, TaskTimeStats>,
  subtasksMap?: Record<string, TaskSubtask[]>,
  limit = 6,
  now: Date = new Date()
): DashboardAgendaTask[] {
  const overdueTasks: DevTask[] = [];
  const todayTasks: DevTask[] = [];
  const priorityTasks: DevTask[] = [];

  for (const task of tasks) {
    if (task.status === "completed") continue;

    if (isTaskOverdue(task, now)) {
      overdueTasks.push(task);
    } else if (isTaskDueToday(task, now)) {
      todayTasks.push(task);
    } else if (
      task.status === "in_progress" &&
      (task.priority === "critical" || task.priority === "high")
    ) {
      priorityTasks.push(task);
    }
  }

  // Sort groups deterministically
  overdueTasks.sort((a, b) => {
    // Earliest due date first
    const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
    const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
    return aDate - bDate;
  });

  todayTasks.sort((a, b) => {
    // Critical first, then high
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });

  priorityTasks.sort((a, b) => {
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });

  const combined: { task: DevTask; category: "overdue" | "today" | "in_progress_priority" }[] = [
    ...overdueTasks.map((task) => ({ task, category: "overdue" as const })),
    ...todayTasks.map((task) => ({ task, category: "today" as const })),
    ...priorityTasks.map((task) => ({ task, category: "in_progress_priority" as const })),
  ];

  const results: DashboardAgendaTask[] = [];

  for (const item of combined.slice(0, limit)) {
    const project = item.task.project_id ? projectMap.get(item.task.project_id) : null;
    const subs = subtasksMap ? subtasksMap[item.task.id] : undefined;
    const totalSubs = subs ? subs.length : 0;
    const completedSubs = subs ? subs.filter((s) => s.completed).length : 0;

    results.push({
      task: item.task,
      category: item.category,
      projectName: project ? project.name : null,
      projectColor: project ? project.color : null,
      githubLinks: githubLinksMap[item.task.id] || [],
      timeStats: taskTimeMap[item.task.id],
      subtaskProgress: totalSubs > 0 ? { completed: completedSubs, total: totalSubs } : null,
    });
  }

  return results;
}
