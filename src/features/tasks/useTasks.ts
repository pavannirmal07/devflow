import { useCallback, useEffect, useState } from "react";
import type { CreateTaskInput, DevTask, TaskSubtask, UpdateTaskInput } from "./types";
import {
  getTasks,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
} from "./tasks";
import { getAllSubtasksForUser } from "./subtasks";
import { getAllGitHubLinksForUser } from "../github/github";
import type { TaskGitHubLink } from "../github/types";

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [subtasksMap, setSubtasksMap] = useState<Record<string, TaskSubtask[]>>({});
  const [githubLinksMap, setGithubLinksMap] = useState<Record<string, TaskGitHubLink[]>>({});
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isSubscribed = true;

    Promise.all([
      getTasks(userId),
      getAllSubtasksForUser(userId),
      getAllGitHubLinksForUser(userId),
    ]).then(([tasksRes, subtasksRes, githubRes]) => {
      if (!isSubscribed) return;

      if (tasksRes.error) {
        console.error("Failed to load tasks:", tasksRes.error);
        setError(tasksRes.error.message);
        setTasks([]);
        setSubtasksMap({});
        setGithubLinksMap({});
      } else {
        setTasks(tasksRes.tasks || []);
        setError(null);

        const subMap: Record<string, TaskSubtask[]> = {};
        if (subtasksRes.subtasks) {
          for (const sub of subtasksRes.subtasks) {
            if (!subMap[sub.task_id]) {
              subMap[sub.task_id] = [];
            }
            subMap[sub.task_id].push(sub);
          }
          for (const key of Object.keys(subMap)) {
            subMap[key].sort((a, b) => a.position - b.position);
          }
        }
        setSubtasksMap(subMap);

        const ghMap: Record<string, TaskGitHubLink[]> = {};
        if (githubRes.links) {
          for (const link of githubRes.links) {
            if (!ghMap[link.task_id]) {
              ghMap[link.task_id] = [];
            }
            ghMap[link.task_id].push(link);
          }
        }
        setGithubLinksMap(ghMap);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  const updateTaskGitHubLinks = useCallback(
    (taskId: string, links: TaskGitHubLink[]) => {
      setGithubLinksMap((prev) => ({
        ...prev,
        [taskId]: links,
      }));
    },
    []
  );

  const updateTaskSubtasks = useCallback((taskId: string, subtasks: TaskSubtask[]) => {
    setSubtasksMap((prev) => ({
      ...prev,
      [taskId]: [...subtasks].sort((a, b) => a.position - b.position),
    }));
  }, []);

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
    setSubtasksMap((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setError(null);
    return { error: null };
  };

  const refreshTasks = async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    const [tasksRes, subtasksRes, githubRes] = await Promise.all([
      getTasks(userId),
      getAllSubtasksForUser(userId),
      getAllGitHubLinksForUser(userId),
    ]);

    if (tasksRes.error) {
      setError(tasksRes.error.message);
    } else {
      setTasks(tasksRes.tasks || []);
      setError(null);

      const subMap: Record<string, TaskSubtask[]> = {};
      if (subtasksRes.subtasks) {
        for (const sub of subtasksRes.subtasks) {
          if (!subMap[sub.task_id]) {
            subMap[sub.task_id] = [];
          }
          subMap[sub.task_id].push(sub);
        }
        for (const key of Object.keys(subMap)) {
          subMap[key].sort((a, b) => a.position - b.position);
        }
      }
      setSubtasksMap(subMap);

      const ghMap: Record<string, TaskGitHubLink[]> = {};
      if (githubRes.links) {
        for (const link of githubRes.links) {
          if (!ghMap[link.task_id]) {
            ghMap[link.task_id] = [];
          }
          ghMap[link.task_id].push(link);
        }
      }
      setGithubLinksMap(ghMap);
    }
    setLoading(false);
  };

  return {
    tasks: userId ? tasks : [],
    subtasksMap,
    githubLinksMap,
    updateTaskSubtasks,
    updateTaskGitHubLinks,
    loading: userId ? loading : false,
    error: userId ? error : null,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks,
  };
}
