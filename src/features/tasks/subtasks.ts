import { supabase } from "../../lib/supabase/client";
import type { CreateSubtaskInput, TaskSubtask, UpdateSubtaskInput } from "./types";

const SUBTASK_COLUMNS = "id, task_id, title, completed, position, created_at, updated_at";

export async function getSubtasks(
  taskId: string
): Promise<{ subtasks: TaskSubtask[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("task_subtasks")
      .select(SUBTASK_COLUMNS)
      .eq("task_id", taskId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return { subtasks: null, error: new Error(error.message) };
    }

    return { subtasks: data as TaskSubtask[], error: null };
  } catch (err) {
    return {
      subtasks: null,
      error: err instanceof Error ? err : new Error("Failed to fetch subtasks"),
    };
  }
}

export async function getAllSubtasksForUser(
  userId: string
): Promise<{ subtasks: TaskSubtask[] | null; error: Error | null }> {
  try {
    if (!userId) {
      return { subtasks: [], error: null };
    }

    // Under Supabase RLS, selecting from task_subtasks will only return rows belonging to user's tasks
    const { data, error } = await supabase
      .from("task_subtasks")
      .select(SUBTASK_COLUMNS)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return { subtasks: null, error: new Error(error.message) };
    }

    return { subtasks: data as TaskSubtask[], error: null };
  } catch (err) {
    return {
      subtasks: null,
      error: err instanceof Error ? err : new Error("Failed to fetch user subtasks"),
    };
  }
}

export async function createSubtask(
  input: CreateSubtaskInput
): Promise<{ subtask: TaskSubtask | null; error: Error | null }> {
  try {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return { subtask: null, error: new Error("Subtask title cannot be empty") };
    }

    let targetPosition = input.position;

    // If position is not explicitly supplied, find current max position and append to end
    if (targetPosition === undefined) {
      const { data: existingSubtasks } = await supabase
        .from("task_subtasks")
        .select("position")
        .eq("task_id", input.task_id)
        .order("position", { ascending: false })
        .limit(1);

      if (existingSubtasks && existingSubtasks.length > 0) {
        targetPosition = (existingSubtasks[0].position ?? 0) + 1;
      } else {
        targetPosition = 0;
      }
    }

    const payload = {
      task_id: input.task_id,
      title: trimmedTitle,
      completed: false,
      position: targetPosition,
    };

    const { data, error } = await supabase
      .from("task_subtasks")
      .insert(payload)
      .select(SUBTASK_COLUMNS)
      .single();

    if (error) {
      return { subtask: null, error: new Error(error.message) };
    }

    return { subtask: data as TaskSubtask, error: null };
  } catch (err) {
    return {
      subtask: null,
      error: err instanceof Error ? err : new Error("Failed to create subtask"),
    };
  }
}

export async function updateSubtask(
  subtaskId: string,
  input: UpdateSubtaskInput
): Promise<{ subtask: TaskSubtask | null; error: Error | null }> {
  try {
    const payload: {
      title?: string;
      completed?: boolean;
      position?: number;
    } = {};

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) {
        return { subtask: null, error: new Error("Subtask title cannot be empty") };
      }
      payload.title = trimmed;
    }

    if (input.completed !== undefined) {
      payload.completed = input.completed;
    }

    if (input.position !== undefined) {
      payload.position = input.position;
    }

    const { data, error } = await supabase
      .from("task_subtasks")
      .update(payload)
      .eq("id", subtaskId)
      .select(SUBTASK_COLUMNS)
      .single();

    if (error) {
      return { subtask: null, error: new Error(error.message) };
    }

    return { subtask: data as TaskSubtask, error: null };
  } catch (err) {
    return {
      subtask: null,
      error: err instanceof Error ? err : new Error("Failed to update subtask"),
    };
  }
}

export async function deleteSubtask(
  subtaskId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("task_subtasks")
      .delete()
      .eq("id", subtaskId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to delete subtask"),
    };
  }
}

export async function reorderSubtasks(
  taskId: string,
  subtaskIds: string[]
): Promise<{ error: Error | null }> {
  try {
    if (subtaskIds.length === 0) return { error: null };

    // Update position of each subtask based on its index
    const updatePromises = subtaskIds.map((id, index) =>
      supabase
        .from("task_subtasks")
        .update({ position: index })
        .eq("id", id)
        .eq("task_id", taskId)
    );

    const results = await Promise.all(updatePromises);
    const firstError = results.find((r) => r.error)?.error;

    if (firstError) {
      return { error: new Error(firstError.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to reorder subtasks"),
    };
  }
}
