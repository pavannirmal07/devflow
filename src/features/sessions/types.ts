export type SessionStatus = "active" | "paused" | "completed";

export interface DevSession {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  description: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  accumulated_seconds: number;
  last_resumed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  title: string;
  description?: string | null;
  task_id?: string | null;
}

export type { TaskTimeSessionSummary, TaskTimeStats } from "../tasks/types";
