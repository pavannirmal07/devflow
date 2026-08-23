import { supabase } from "../../lib/supabase/client";
import type { CreateSessionInput, DevSession } from "./types";

export async function getSessions(
  userId: string
): Promise<{ sessions: DevSession[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, user_id, title, description, status, started_at, ended_at, duration_seconds, created_at, updated_at")
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
      .select("id, user_id, title, description, status, started_at, ended_at, duration_seconds, created_at, updated_at")
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
  userId: string,
  input: CreateSessionInput
): Promise<{ session: DevSession | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
      })
      .select("id, user_id, title, description, status, started_at, ended_at, duration_seconds, created_at, updated_at")
      .single();

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

export async function completeSession(
  sessionId: string,
  startedAt: string
): Promise<{ session: DevSession | null; error: Error | null }> {
  try {
    const startTime = new Date(startedAt).getTime();
    const now = Date.now();
    const durationSeconds = Math.max(0, Math.round((now - startTime) / 1000));
    const endedAt = new Date(now).toISOString();

    const { data, error } = await supabase
      .from("sessions")
      .update({
        status: "completed",
        ended_at: endedAt,
        duration_seconds: durationSeconds,
      })
      .eq("id", sessionId)
      .select("id, user_id, title, description, status, started_at, ended_at, duration_seconds, created_at, updated_at")
      .single();

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
