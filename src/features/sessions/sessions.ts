import { supabase } from "../../lib/supabase/client";
import type {
  CreateSessionInput,
  DevSession,
  SessionStatus,
  TaskTimeSessionSummary,
  TaskTimeStats,
} from "./types";
import { computeSessionDuration } from "../tasks/utils/duration";

export async function getSessions(
  userId: string
): Promise<{ sessions: DevSession[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, user_id, task_id, title, description, status, started_at, ended_at, duration_seconds, accumulated_seconds, last_resumed_at, created_at, updated_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (error) {
      return { sessions: null, error: new Error(error.message) };
    }

    return { sessions: data as DevSession[], error: null };
  } catch (err) {
    return {
      sessions: null,
      error: err instanceof Error ? err : new Error("Failed to fetch sessions"),
    };
  }
}

export async function getSessionById(
  sessionId: string
): Promise<{ session: DevSession | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, user_id, task_id, title, description, status, started_at, ended_at, duration_seconds, accumulated_seconds, last_resumed_at, created_at, updated_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      return { session: null, error: new Error(error.message) };
    }

    return { session: data as DevSession | null, error: null };
  } catch (err) {
    return {
      session: null,
      error: err instanceof Error ? err : new Error("Failed to fetch session"),
    };
  }
}

export async function createSession(
  _userId: string,
  input: CreateSessionInput
): Promise<{ session: DevSession | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("start_session", {
      p_title: input.title.trim(),
      p_description: input.description?.trim() || null,
      p_task_id: input.task_id || null,
    });

    if (error) {
      return { session: null, error: new Error(error.message) };
    }

    return { session: data as DevSession, error: null };
  } catch (err) {
    return {
      session: null,
      error: err instanceof Error ? err : new Error("Failed to create session"),
    };
  }
}

export async function pauseSession(
  sessionId: string
): Promise<{ session: DevSession | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("pause_session", {
      p_session_id: sessionId,
    });

    if (error) {
      return { session: null, error: new Error(error.message) };
    }

    return { session: data as DevSession, error: null };
  } catch (err) {
    return {
      session: null,
      error: err instanceof Error ? err : new Error("Failed to pause session"),
    };
  }
}

export async function resumeSession(
  sessionId: string
): Promise<{ session: DevSession | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("resume_session", {
      p_session_id: sessionId,
    });

    if (error) {
      return { session: null, error: new Error(error.message) };
    }

    return { session: data as DevSession, error: null };
  } catch (err) {
    return {
      session: null,
      error: err instanceof Error ? err : new Error("Failed to resume session"),
    };
  }
}

export async function completeSession(
  sessionId: string
): Promise<{ session: DevSession | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("complete_session", {
      p_session_id: sessionId,
    });

    if (error) {
      return { session: null, error: new Error(error.message) };
    }

    return { session: data as DevSession, error: null };
  } catch (err) {
    return {
      session: null,
      error: err instanceof Error ? err : new Error("Failed to complete session"),
    };
  }
}

export async function deleteSession(
  sessionId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to delete session"),
    };
  }
}

export async function getTaskTimeStatsForUser(
  userId: string
): Promise<{ timeStatsMap: Record<string, TaskTimeStats>; error: Error | null }> {
  try {
    if (!userId) {
      return { timeStatsMap: {}, error: null };
    }

    const { data, error } = await supabase
      .from("sessions")
      .select("id, task_id, title, status, started_at, ended_at, duration_seconds, accumulated_seconds, last_resumed_at")
      .eq("user_id", userId)
      .not("task_id", "is", null)
      .order("started_at", { ascending: false });

    if (error) {
      return { timeStatsMap: {}, error: new Error(error.message) };
    }

    const map: Record<string, TaskTimeStats> = {};

    if (data) {
      for (const row of data) {
        if (!row.task_id) continue;

        if (!map[row.task_id]) {
          map[row.task_id] = {
            totalSeconds: 0,
            sessionCount: 0,
            sessions: [],
          };
        }

        const summary: TaskTimeSessionSummary = {
          id: row.id,
          title: row.title,
          duration_seconds: row.duration_seconds,
          accumulated_seconds: row.accumulated_seconds ?? 0,
          status: row.status as SessionStatus,
          started_at: row.started_at,
          ended_at: row.ended_at,
          last_resumed_at: row.last_resumed_at,
        };

        const duration = computeSessionDuration(summary);
        map[row.task_id].totalSeconds += duration;
        map[row.task_id].sessionCount += 1;
        map[row.task_id].sessions.push(summary);
      }
    }

    return { timeStatsMap: map, error: null };
  } catch (err) {
    return {
      timeStatsMap: {},
      error: err instanceof Error ? err : new Error("Failed to fetch task time stats"),
    };
  }
}
