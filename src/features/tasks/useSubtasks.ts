import { useCallback, useEffect, useMemo, useState } from "react";
import type { SubtaskProgress, TaskSubtask, UpdateSubtaskInput } from "./types";
import {
  createSubtask as createSubtaskApi,
  deleteSubtask as deleteSubtaskApi,
  getSubtasks,
  reorderSubtasks as reorderSubtasksApi,
  updateSubtask as updateSubtaskApi,
} from "./subtasks";

export interface UseSubtasksOptions {
  initialSubtasks?: TaskSubtask[];
  onSubtasksChange?: (subtasks: TaskSubtask[]) => void;
}

export function useSubtasks(taskId?: string, options?: UseSubtasksOptions) {
  const initialSubtasks = options?.initialSubtasks;
  const onSubtasksChange = options?.onSubtasksChange;

  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(() =>
    initialSubtasks
      ? [...initialSubtasks].sort((a, b) => a.position - b.position)
      : []
  );
  const [loading, setLoading] = useState(Boolean(taskId && !initialSubtasks));
  const [error, setError] = useState<string | null>(null);

  const refreshSubtasks = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    const { subtasks: fetched, error: fetchErr } = await getSubtasks(taskId);

    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      const sorted = (fetched || []).sort((a, b) => a.position - b.position);
      setSubtasks(sorted);
      onSubtasksChange?.(sorted);
      setError(null);
    }
    setLoading(false);
  }, [taskId, onSubtasksChange]);

  useEffect(() => {
    if (!taskId || initialSubtasks) {
      return;
    }

    let isMounted = true;

    getSubtasks(taskId).then(({ subtasks: fetched, error: fetchErr }) => {
      if (!isMounted) return;

      if (fetchErr) {
        setError(fetchErr.message);
        setSubtasks([]);
      } else {
        const sorted = (fetched || []).sort((a, b) => a.position - b.position);
        setSubtasks(sorted);
        onSubtasksChange?.(sorted);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [taskId, initialSubtasks, onSubtasksChange]);

  const progress = useMemo<SubtaskProgress>(() => {
    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [subtasks]);

  const createSubtask = useCallback(
    async (
      title: string
    ): Promise<{ subtask: TaskSubtask | null; error: Error | null }> => {
      if (!taskId) {
        const err = new Error("Task ID is required to create a subtask");
        setError(err.message);
        return { subtask: null, error: err };
      }

      const trimmed = title.trim();
      if (!trimmed) {
        const err = new Error("Subtask title cannot be empty");
        setError(err.message);
        return { subtask: null, error: err };
      }

      const { subtask: created, error: createErr } = await createSubtaskApi({
        task_id: taskId,
        title: trimmed,
      });

      if (createErr) {
        setError(createErr.message);
        return { subtask: null, error: createErr };
      }

      if (created) {
        setSubtasks((prev) => {
          const next = [...prev, created].sort((a, b) => a.position - b.position);
          onSubtasksChange?.(next);
          return next;
        });
        setError(null);
      }

      return { subtask: created, error: null };
    },
    [taskId, onSubtasksChange]
  );

  const updateSubtask = useCallback(
    async (
      subtaskId: string,
      input: UpdateSubtaskInput
    ): Promise<{ subtask: TaskSubtask | null; error: Error | null }> => {
      // Optimistic update
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, ...input } : s))
      );

      const { subtask: updated, error: updateErr } = await updateSubtaskApi(
        subtaskId,
        input
      );

      if (updateErr) {
        setError(updateErr.message);
        // Rollback on error
        await refreshSubtasks();
        return { subtask: null, error: updateErr };
      }

      if (updated) {
        setSubtasks((prev) => {
          const next = prev
            .map((s) => (s.id === subtaskId ? updated : s))
            .sort((a, b) => a.position - b.position);
          onSubtasksChange?.(next);
          return next;
        });
        setError(null);
      }

      return { subtask: updated, error: null };
    },
    [onSubtasksChange, refreshSubtasks]
  );

  const toggleSubtask = useCallback(
    async (
      subtaskId: string,
      completed: boolean
    ): Promise<{ subtask: TaskSubtask | null; error: Error | null }> => {
      return updateSubtask(subtaskId, { completed });
    },
    [updateSubtask]
  );

  const deleteSubtask = useCallback(
    async (subtaskId: string): Promise<{ error: Error | null }> => {
      // Optimistic removal
      const previous = [...subtasks];
      setSubtasks((prev) => {
        const next = prev.filter((s) => s.id !== subtaskId);
        onSubtasksChange?.(next);
        return next;
      });

      const { error: delErr } = await deleteSubtaskApi(subtaskId);

      if (delErr) {
        setError(delErr.message);
        setSubtasks(previous);
        onSubtasksChange?.(previous);
        return { error: delErr };
      }

      setError(null);
      return { error: null };
    },
    [subtasks, onSubtasksChange]
  );

  const moveSubtask = useCallback(
    async (
      subtaskId: string,
      direction: "up" | "down"
    ): Promise<{ error: Error | null }> => {
      if (!taskId) return { error: new Error("Task ID is required") };

      const currentIndex = subtasks.findIndex((s) => s.id === subtaskId);
      if (currentIndex === -1) return { error: new Error("Subtask not found") };

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= subtasks.length) {
        return { error: null }; // Already at edge
      }

      const reordered = [...subtasks];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      // Re-assign positions
      const updatedList = reordered.map((item, idx) => ({
        ...item,
        position: idx,
      }));

      // Optimistic update
      setSubtasks(updatedList);
      onSubtasksChange?.(updatedList);

      const subtaskIds = updatedList.map((s) => s.id);
      const { error: reorderErr } = await reorderSubtasksApi(taskId, subtaskIds);

      if (reorderErr) {
        setError(reorderErr.message);
        // Rollback
        await refreshSubtasks();
        return { error: reorderErr };
      }

      setError(null);
      return { error: null };
    },
    [taskId, subtasks, onSubtasksChange, refreshSubtasks]
  );

  return {
    subtasks,
    loading,
    error,
    progress,
    createSubtask,
    updateSubtask,
    toggleSubtask,
    deleteSubtask,
    moveSubtask,
    refreshSubtasks,
  };
}
