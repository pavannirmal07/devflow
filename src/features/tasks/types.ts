export type TaskStatus = "todo" | "in_progress" | "completed";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TaskDueDateFilter = "all" | "today" | "this_week" | "overdue";


export interface DevTask {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  project_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSubtaskInput {
  task_id: string;
  title: string;
  position?: number;
}

export interface UpdateSubtaskInput {
  title?: string;
  completed?: boolean;
  position?: number;
}

export interface SubtaskProgress {
  total: number;
  completed: number;
  percent: number;
}

export interface TaskTimeSessionSummary {
  id: string;
  title: string;
  duration_seconds: number | null;
  accumulated_seconds: number;
  status: import("../sessions/types").SessionStatus;
  started_at: string;
  ended_at: string | null;
  last_resumed_at?: string | null;
}

export interface TaskTimeStats {
  totalSeconds: number;
  sessionCount: number;
  sessions: TaskTimeSessionSummary[];
}

export type { TaskGitHubLink, TaskGitHubLinkType, CreateGitHubLinkInput } from "../github/types";
