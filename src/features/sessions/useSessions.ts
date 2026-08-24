import { useEffect, useState } from "react";
import type { CreateSessionInput, DevSession } from "./types";
import {
  getSessions,
  createSession,
  pauseSession as pauseSessionApi,
  resumeSession as resumeSessionApi,
  completeSession,
  deleteSession as deleteSessionApi,
} from "./sessions";

export function useSessions(userId?: string) {
  const [sessions, setSessions] = useState<DevSession[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isSubscribed = true;

    getSessions(userId).then(({ sessions: fetchedSessions, error: fetchError }) => {
      if (!isSubscribed) return;

      if (fetchError) {
        console.error("Failed to load sessions:", fetchError);
        setError(fetchError.message);
        setSessions([]);
      } else {
        setSessions(fetchedSessions || []);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  const activeSession = userId
    ? sessions.find((s) => s.status === "active" || s.status === "paused") || null
    : null;

  const startSession = async (
    input: CreateSessionInput
  ): Promise<{ session: DevSession | null; error: Error | null }> => {
    if (!userId) {
      const err = new Error("User must be authenticated to start a session");
      setError(err.message);
      return { session: null, error: err };
    }

    const { session: newSession, error: createError } = await createSession(
      userId,
      input
    );

    if (createError) {
      setError(createError.message);
      return { session: null, error: createError };
    }

    if (newSession) {
      setSessions((prev) => [
        newSession,
        ...prev.filter((s) => s.id !== newSession.id),
      ]);
      setError(null);
    }

    return { session: newSession, error: null };
  };

  const pauseSession = async (
    sessionId: string
  ): Promise<{ session: DevSession | null; error: Error | null }> => {
    const { session: paused, error: pauseError } = await pauseSessionApi(sessionId);

    if (pauseError) {
      setError(pauseError.message);
      return { session: null, error: pauseError };
    }

    if (paused) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? paused : s))
      );
      setError(null);
    }

    return { session: paused, error: null };
  };

  const resumeSession = async (
    sessionId: string
  ): Promise<{ session: DevSession | null; error: Error | null }> => {
    const { session: resumed, error: resumeError } = await resumeSessionApi(sessionId);

    if (resumeError) {
      setError(resumeError.message);
      return { session: null, error: resumeError };
    }

    if (resumed) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? resumed : s))
      );
      setError(null);
    }

    return { session: resumed, error: null };
  };

  const endSession = async (
    sessionId: string
  ): Promise<{ session: DevSession | null; error: Error | null }> => {
    const { session: completed, error: completeError } = await completeSession(
      sessionId
    );

    if (completeError) {
      setError(completeError.message);
      return { session: null, error: completeError };
    }

    if (completed) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? completed : s))
      );
      setError(null);
    }

    return { session: completed, error: null };
  };

  const deleteSession = async (
    sessionId: string
  ): Promise<{ error: Error | null }> => {
    const { error: deleteError } = await deleteSessionApi(sessionId);

    if (deleteError) {
      setError(deleteError.message);
      return { error: deleteError };
    }

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setError(null);
    return { error: null };
  };

  const refreshSessions = async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    const { sessions: fetchedSessions, error: fetchError } = await getSessions(
      userId
    );

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setSessions(fetchedSessions || []);
      setError(null);
    }
    setLoading(false);
  };

  return {
    sessions: userId ? sessions : [],
    activeSession,
    inProgressSession: activeSession,
    isPaused: activeSession?.status === "paused",
    loading: userId ? loading : false,
    error: userId ? error : null,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    deleteSession,
    refreshSessions,
  };
}
