import { supabase } from "../../lib/supabase/client";
import type { CreateTaskInput, DevTask, TaskPriority, TaskStatus, UpdateTaskInput } from "./types";

const TASK_COLUMNS = "id, user_id, project_id, title, description, status, priority, due_date, created_at, updated_at";

export async function getTasks(
  userId: string
): Promise<{ tasks: DevTask[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return { tasks: null, error: new Error(error.message) };
    }

    return { tasks: data as DevTask[], error: null };
  } catch (err) {
    return {
      tasks: null,
      error: err instanceof Error ? err : new Error("Failed to fetch tasks"),
    };
  }
}

export async function createTask(
  userId: string,
  input: CreateTaskInput
): Promise<{ task: DevTask | null; error: Error | null }> {
  try {
    const payload: {
      user_id: string;
      title: string;
      description?: string | null;
      project_id?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      due_date?: string | null;
    } = {
      user_id: userId,
      title: input.title.trim(),
    };

    if (input.description !== undefined) {
      payload.description = input.description ? input.description.trim() : null;
    }
    if (input.project_id !== undefined) {
      payload.project_id = input.project_id || null;
    }
    if (input.status !== undefined) {
      payload.status = input.status;
    }
    if (input.priority !== undefined) {
      payload.priority = input.priority;
    }
    if (input.due_date !== undefined) {
      payload.due_date = input.due_date ? input.due_date.trim() : null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select(TASK_COLUMNS)
      .single();

    if (error) {
      return { task: null, error: new Error(error.message) };
    }

    return { task: data as DevTask, error: null };
  } catch (err) {
    return {
      task: null,
      error: err instanceof Error ? err : new Error("Failed to create task"),
    };
  }
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<{ task: DevTask | null; error: Error | null }> {
  try {
    const payload: {
      title?: string;
      description?: string | null;
      project_id?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      due_date?: string | null;
    } = {};

    if (input.title !== undefined) {
      payload.title = input.title.trim();
    }
    if (input.description !== undefined) {
      payload.description = input.description ? input.description.trim() : null;
    }
    if (input.project_id !== undefined) {
      payload.project_id = input.project_id || null;
    }
    if (input.status !== undefined) {
      payload.status = input.status;
    }
    if (input.priority !== undefined) {
      payload.priority = input.priority;
    }
    if (input.due_date !== undefined) {
      payload.due_date = input.due_date ? input.due_date.trim() : null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", taskId)
      .select(TASK_COLUMNS)
      .single();

    if (error) {
      return { task: null, error: new Error(error.message) };
    }

    return { task: data as DevTask, error: null };
  } catch (err) {
    return {
      task: null,
      error: err instanceof Error ? err : new Error("Failed to update task"),
    };
  }
}

export async function deleteTask(
  taskId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to delete task"),
    };
  }
}
