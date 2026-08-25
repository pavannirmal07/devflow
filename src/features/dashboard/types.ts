import type { DevTask, TaskTimeStats } from "../tasks/types";
import type { TaskGitHubLink } from "../github/types";

export interface DashboardMetrics {
  todayFocusSeconds: number;
  weekFocusSeconds: number;
  todayCompletedSessionsCount: number;
  todayCompletedTasksCount: number;
  activeTasksCount: number;
  overdueTasksCount: number;
  dueTodayTasksCount: number;
  dailyFocusGoalSeconds: number;
}

export type AgendaCategory = "overdue" | "today" | "in_progress_priority";

export interface DashboardAgendaTask {
  task: DevTask;
  category: AgendaCategory;
  formattedDue?: string;
  projectName?: string | null;
  projectColor?: string | null;
  githubLinks?: TaskGitHubLink[];
  timeStats?: TaskTimeStats;
  subtaskProgress?: { completed: number; total: number } | null;
}
