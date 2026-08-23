import { useEffect, useState } from "react";
import type { CreateTaskInput, DevTask, UpdateTaskInput } from "./types";
import {
  getTasks,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
} from "./tasks";

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isSubscribed = true;

    getTasks(userId).then(({ tasks: fetchedTasks, error: fetchError }) => {
      if (!isSubscribed) return;

      if (fetchError) {
        console.error("Failed to load tasks:", fetchError);
        setError(fetchError.message);
        setTasks([]);
      } else {
        setTasks(fetchedTasks || []);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  const createTask = async (
    input: CreateTaskInput
  ): Promise<{ task: DevTask | null; error: Error | null }> => {
    if (!userId) {
      const err = new Error("User must be authenticated to create a task");
      setError(err.message);
      return { task: null, error: err };
    }

    const { task: newTask, error: createError } = await createTaskApi(
      userId,
      input
    );

    if (createError) {
      setError(createError.message);
      return { task: null, error: createError };
    }

    if (newTask) {
      setTasks((prev) => [
        newTask,
        ...prev.filter((t) => t.id !== newTask.id),
      ]);
      setError(null);
    }

    return { task: newTask, error: null };
  };

  const updateTask = async (
    taskId: string,
    input: UpdateTaskInput
  ): Promise<{ task: DevTask | null; error: Error | null }> => {
    const { task: updatedTask, error: updateError } = await updateTaskApi(
      taskId,
      input
    );

    if (updateError) {
      setError(updateError.message);
      return { task: null, error: updateError };
    }

    if (updatedTask) {
      setTasks((prev) => {
        const updatedList = prev.map((t) =>
          t.id === taskId ? updatedTask : t
        );
        return updatedList.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
      setError(null);
    }

    return { task: updatedTask, error: null };
  };

  const deleteTask = async (
    taskId: string
  ): Promise<{ error: Error | null }> => {
    const { error: deleteError } = await deleteTaskApi(taskId);

    if (deleteError) {
      setError(deleteError.message);
      return { error: deleteError };
    }

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setError(null);
    return { error: null };
  };

  const refreshTasks = async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    const { tasks: fetchedTasks, error: fetchError } = await getTasks(userId);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTasks(fetchedTasks || []);
      setError(null);
    }
    setLoading(false);
  };

  return {
    tasks: userId ? tasks : [],
    loading: userId ? loading : false,
    error: userId ? error : null,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks,
  };
}
