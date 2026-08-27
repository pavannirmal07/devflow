import { supabase } from "../../lib/supabase/client";
import type {
  CreateKnowledgeNoteInput,
  KnowledgeCategory,
  KnowledgeNote,
  UpdateKnowledgeNoteInput,
} from "./types";

const NOTE_COLUMNS =
  "id, user_id, title, summary, problem, investigation, root_cause, solution, lessons_learned, content, project_id, task_id, category, tags, is_pinned, created_at, updated_at";

export async function getKnowledgeNotes(
  userId: string
): Promise<{ notes: KnowledgeNote[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("knowledge_notes")
      .select(NOTE_COLUMNS)
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      return { notes: null, error: new Error(error.message) };
    }

    return { notes: (data as KnowledgeNote[]) || [], error: null };
  } catch (err) {
    return {
      notes: null,
      error: err instanceof Error ? err : new Error("Failed to fetch knowledge notes"),
    };
  }
}

export async function createKnowledgeNote(
  userId: string,
  input: CreateKnowledgeNoteInput
): Promise<{ note: KnowledgeNote | null; error: Error | null }> {
  try {
    const payload: {
      user_id: string;
      title: string;
      summary?: string | null;
      problem?: string | null;
      investigation?: string | null;
      root_cause?: string | null;
      solution?: string | null;
      lessons_learned?: string | null;
      content?: string | null;
      project_id?: string | null;
      task_id?: string | null;
      category: KnowledgeCategory;
      tags: string[];
      is_pinned: boolean;
    } = {
      user_id: userId,
      title: input.title.trim(),
      category: input.category || "Bugfix",
      tags: input.tags ? input.tags.map((t) => t.trim()).filter(Boolean) : [],
      is_pinned: Boolean(input.is_pinned),
    };

    if (input.summary !== undefined) {
      payload.summary = input.summary ? input.summary.trim() : null;
    }
    if (input.problem !== undefined) {
      payload.problem = input.problem ? input.problem.trim() : null;
    }
    if (input.investigation !== undefined) {
      payload.investigation = input.investigation ? input.investigation.trim() : null;
    }
    if (input.root_cause !== undefined) {
      payload.root_cause = input.root_cause ? input.root_cause.trim() : null;
    }
    if (input.solution !== undefined) {
      payload.solution = input.solution ? input.solution.trim() : null;
    }
    if (input.lessons_learned !== undefined) {
      payload.lessons_learned = input.lessons_learned ? input.lessons_learned.trim() : null;
    }
    if (input.content !== undefined) {
      payload.content = input.content ? input.content.trim() : null;
    }
    if (input.project_id !== undefined) {
      payload.project_id = input.project_id || null;
    }
    if (input.task_id !== undefined) {
      payload.task_id = input.task_id || null;
    }

    const { data, error } = await supabase
      .from("knowledge_notes")
      .insert(payload)
      .select(NOTE_COLUMNS)
      .single();

    if (error) {
      return { note: null, error: new Error(error.message) };
    }

    return { note: data as KnowledgeNote, error: null };
  } catch (err) {
    return {
      note: null,
      error: err instanceof Error ? err : new Error("Failed to create knowledge note"),
    };
  }
}

export async function updateKnowledgeNote(
  noteId: string,
  input: UpdateKnowledgeNoteInput
): Promise<{ note: KnowledgeNote | null; error: Error | null }> {
  try {
    const payload: {
      title?: string;
      summary?: string | null;
      problem?: string | null;
      investigation?: string | null;
      root_cause?: string | null;
      solution?: string | null;
      lessons_learned?: string | null;
      content?: string | null;
      project_id?: string | null;
      task_id?: string | null;
      category?: KnowledgeCategory;
      tags?: string[];
      is_pinned?: boolean;
    } = {};

    if (input.title !== undefined) {
      payload.title = input.title.trim();
    }
    if (input.summary !== undefined) {
      payload.summary = input.summary ? input.summary.trim() : null;
    }
    if (input.problem !== undefined) {
      payload.problem = input.problem ? input.problem.trim() : null;
    }
    if (input.investigation !== undefined) {
      payload.investigation = input.investigation ? input.investigation.trim() : null;
    }
    if (input.root_cause !== undefined) {
      payload.root_cause = input.root_cause ? input.root_cause.trim() : null;
    }
    if (input.solution !== undefined) {
      payload.solution = input.solution ? input.solution.trim() : null;
    }
    if (input.lessons_learned !== undefined) {
      payload.lessons_learned = input.lessons_learned ? input.lessons_learned.trim() : null;
    }
    if (input.content !== undefined) {
      payload.content = input.content ? input.content.trim() : null;
    }
    if (input.project_id !== undefined) {
      payload.project_id = input.project_id || null;
    }
    if (input.task_id !== undefined) {
      payload.task_id = input.task_id || null;
    }
    if (input.category !== undefined) {
      payload.category = input.category;
    }
    if (input.tags !== undefined) {
      payload.tags = input.tags.map((t) => t.trim()).filter(Boolean);
    }
    if (input.is_pinned !== undefined) {
      payload.is_pinned = input.is_pinned;
    }

    const { data, error } = await supabase
      .from("knowledge_notes")
      .update(payload)
      .eq("id", noteId)
      .select(NOTE_COLUMNS)
      .single();

    if (error) {
      return { note: null, error: new Error(error.message) };
    }

    return { note: data as KnowledgeNote, error: null };
  } catch (err) {
    return {
      note: null,
      error: err instanceof Error ? err : new Error("Failed to update knowledge note"),
    };
  }
}

export async function deleteKnowledgeNote(
  noteId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("knowledge_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to delete knowledge note"),
    };
  }
}

export async function togglePinKnowledgeNote(
  noteId: string,
  isPinned: boolean
): Promise<{ note: KnowledgeNote | null; error: Error | null }> {
  return updateKnowledgeNote(noteId, { is_pinned: isPinned });
}
