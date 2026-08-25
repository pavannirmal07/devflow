import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY_PREFIX = "devflow_focus_target_";
export const DEFAULT_GOAL_SECONDS = 4 * 3600; // 4 hours

function getStoredGoal(userId?: string): number {
  if (!userId || typeof window === "undefined") {
    return DEFAULT_GOAL_SECONDS;
  }
  try {
    const stored = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (stored) {
      const parsed = Number(stored);
      if (!isNaN(parsed) && parsed >= 60 && parsed <= 24 * 3600) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to read focus target from localStorage:", e);
  }
  return DEFAULT_GOAL_SECONDS;
}

export function useFocusGoal(userId?: string) {
  const [goalSeconds, setGoalSecondsState] = useState<number>(() => getStoredGoal(userId));

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (userId && e.key === `${STORAGE_KEY_PREFIX}${userId}` && e.newValue) {
        const parsed = Number(e.newValue);
        if (!isNaN(parsed) && parsed >= 60 && parsed <= 24 * 3600) {
          setGoalSecondsState(parsed);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [userId]);

  const setGoalSeconds = useCallback(
    (seconds: number) => {
      const validSeconds = Math.max(60, Math.min(24 * 3600, Math.round(seconds)));
      setGoalSecondsState(validSeconds);
      if (userId && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, String(validSeconds));
        } catch (e) {
          console.warn("Failed to save focus target to localStorage:", e);
        }
      }
    },
    [userId]
  );

  return {
    goalSeconds,
    setGoalSeconds,
  };
}
