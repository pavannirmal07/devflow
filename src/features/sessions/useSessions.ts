import { useEffect, useSyncExternalStore, useCallback } from "react";
import type { CreateSessionInput, DevSession } from "./types";
import {
  getSessions,
  createSession,
  pauseSession as pauseSessionApi,
  resumeSession as resumeSessionApi,
  completeSession,
  deleteSession as deleteSessionApi,
} from "./sessions";

interface SessionStoreState {
  sessions: DevSession[];
  loading: boolean;
  error: string | null;
  userId: string | null;
  fetched: boolean;
}

let sessionStore: SessionStoreState = {
  sessions: [],
  loading: false,
  error: null,
  userId: null,
  fetched: false,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateStore(partial: Partial<SessionStoreState>) {
  sessionStore = { ...sessionStore, ...partial };
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return sessionStore;
}

export function useSessions(userId?: string) {
  const store = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!userId) {
      return;
    }

    if (sessionStore.userId !== userId || !sessionStore.fetched) {
      updateStore({ userId, loading: true, error: null });
      getSessions(userId).then(({ sessions: fetchedSessions, error: fetchError }) => {
        if (fetchError) {
          console.error("Failed to load sessions:", fetchError);
          updateStore({
            sessions: [],
            error: fetchError.message,
            loading: false,
            fetched: true,
          });
        } else {
          updateStore({
            sessions: fetchedSessions || [],
            error: null,
            loading: false,
            fetched: true,
          });
        }
      });
    }
  }, [userId]);

  const activeSession = userId
    ? store.sessions.find((s) => s.status === "active" || s.status === "paused") || null
    : null;

  const startSession = useCallback(
    async (
      input: CreateSessionInput
    ): Promise<{ session: DevSession | null; error: Error | null }> => {
      if (!userId) {
        const err = new Error("User must be authenticated to start a session");
        updateStore({ error: err.message });
        return { session: null, error: err };
      }

      const { session: newSession, error: createError } = await createSession(
        userId,
        input
      );

      if (createError) {
        updateStore({ error: createError.message });
        return { session: null, error: createError };
      }

      if (newSession) {
        updateStore({
          sessions: [
            newSession,
            ...sessionStore.sessions.filter((s) => s.id !== newSession.id),
          ],
          error: null,
        });
      }

      return { session: newSession, error: null };
    },
    [userId]
  );

  const pauseSession = useCallback(
    async (
      sessionId: string
    ): Promise<{ session: DevSession | null; error: Error | null }> => {
      const { session: paused, error: pauseError } = await pauseSessionApi(sessionId);

      if (pauseError) {
        updateStore({ error: pauseError.message });
        return { session: null, error: pauseError };
      }

      if (paused) {
        updateStore({
          sessions: sessionStore.sessions.map((s) =>
            s.id === sessionId ? paused : s
          ),
          error: null,
        });
      }

      return { session: paused, error: null };
    },
    []
  );

  const resumeSession = useCallback(
    async (
      sessionId: string
    ): Promise<{ session: DevSession | null; error: Error | null }> => {
      const { session: resumed, error: resumeError } = await resumeSessionApi(sessionId);

      if (resumeError) {
        updateStore({ error: resumeError.message });
        return { session: null, error: resumeError };
      }

      if (resumed) {
        updateStore({
          sessions: sessionStore.sessions.map((s) =>
            s.id === sessionId ? resumed : s
          ),
          error: null,
        });
      }

      return { session: resumed, error: null };
    },
    []
  );

  const endSession = useCallback(
    async (
      sessionId: string
    ): Promise<{ session: DevSession | null; error: Error | null }> => {
      const { session: completed, error: completeError } = await completeSession(
        sessionId
      );

      if (completeError) {
        updateStore({ error: completeError.message });
        return { session: null, error: completeError };
      }

      if (completed) {
        updateStore({
          sessions: sessionStore.sessions.map((s) =>
            s.id === sessionId ? completed : s
          ),
          error: null,
        });
      }

      return { session: completed, error: null };
    },
    []
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<{ error: Error | null }> => {
      const { error: deleteError } = await deleteSessionApi(sessionId);

      if (deleteError) {
        updateStore({ error: deleteError.message });
        return { error: deleteError };
      }

      updateStore({
        sessions: sessionStore.sessions.filter((s) => s.id !== sessionId),
        error: null,
      });
      return { error: null };
    },
    []
  );

  const refreshSessions = useCallback(async (): Promise<void> => {
    if (!userId) return;

    updateStore({ loading: true });
    const { sessions: fetchedSessions, error: fetchError } = await getSessions(
      userId
    );

    if (fetchError) {
      updateStore({ error: fetchError.message, loading: false });
    } else {
      updateStore({
        sessions: fetchedSessions || [],
        error: null,
        loading: false,
      });
    }
  }, [userId]);

  return {
    sessions: userId ? store.sessions : [],
    activeSession,
    inProgressSession: activeSession,
    isPaused: activeSession?.status === "paused",
    loading: userId ? store.loading : false,
    error: userId ? store.error : null,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    deleteSession,
    refreshSessions,
  };
}
