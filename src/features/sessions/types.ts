export type SessionStatus = "active" | "completed";

export interface DevSession {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  title: string;
  description?: string | null;
}
