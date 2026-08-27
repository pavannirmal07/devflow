import { supabase } from "../../lib/supabase/client";
import type { CreateProjectInput, DevProject, ProjectStatus, UpdateProjectInput } from "./types";

const PROJECT_COLUMNS =
  "id, user_id, name, description, status, github_url, github_repository_id, github_owner, github_repo, github_default_branch, github_installation_id, color, created_at, updated_at";

export async function getProjects(
  userId: string
): Promise<{ projects: DevProject[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return { projects: null, error: new Error(error.message) };
    }

    return { projects: data as DevProject[], error: null };
  } catch (err) {
    return {
      projects: null,
      error: err instanceof Error ? err : new Error("Failed to fetch projects"),
    };
  }
}

export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<{ project: DevProject | null; error: Error | null }> {
  try {
    const payload: {
      user_id: string;
      name: string;
      description?: string | null;
      status?: ProjectStatus;
      github_url?: string | null;
      github_repository_id?: number | null;
      github_owner?: string | null;
      github_repo?: string | null;
      github_default_branch?: string | null;
      github_installation_id?: number | null;
      color?: string | null;
    } = {
      user_id: userId,
      name: input.name.trim(),
    };

    if (input.description !== undefined) {
      payload.description = input.description ? input.description.trim() : null;
    }
    if (input.status !== undefined) {
      payload.status = input.status;
    }
    if (input.github_url !== undefined) {
      payload.github_url = input.github_url ? input.github_url.trim() : null;
    }
    if (input.github_repository_id !== undefined) {
      payload.github_repository_id = input.github_repository_id;
    }
    if (input.github_owner !== undefined) {
      payload.github_owner = input.github_owner ? input.github_owner.trim() : null;
    }
    if (input.github_repo !== undefined) {
      payload.github_repo = input.github_repo ? input.github_repo.trim() : null;
    }
    if (input.github_default_branch !== undefined) {
      payload.github_default_branch = input.github_default_branch ? input.github_default_branch.trim() : null;
    }
    if (input.github_installation_id !== undefined) {
      payload.github_installation_id = input.github_installation_id;
    }
    if (input.color !== undefined) {
      payload.color = input.color ? input.color.trim() : null;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert(payload)
      .select(PROJECT_COLUMNS)
      .single();

    if (error) {
      return { project: null, error: new Error(error.message) };
    }

    return { project: data as DevProject, error: null };
  } catch (err) {
    return {
      project: null,
      error: err instanceof Error ? err : new Error("Failed to create project"),
    };
  }
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<{ project: DevProject | null; error: Error | null }> {
  try {
    const payload: {
      name?: string;
      description?: string | null;
      status?: ProjectStatus;
      github_url?: string | null;
      github_repository_id?: number | null;
      github_owner?: string | null;
      github_repo?: string | null;
      github_default_branch?: string | null;
      github_installation_id?: number | null;
      color?: string | null;
    } = {};

    if (input.name !== undefined) {
      payload.name = input.name.trim();
    }
    if (input.description !== undefined) {
      payload.description = input.description ? input.description.trim() : null;
    }
    if (input.status !== undefined) {
      payload.status = input.status;
    }
    if (input.github_url !== undefined) {
      payload.github_url = input.github_url ? input.github_url.trim() : null;
    }
    if (input.github_repository_id !== undefined) {
      payload.github_repository_id = input.github_repository_id;
    }
    if (input.github_owner !== undefined) {
      payload.github_owner = input.github_owner ? input.github_owner.trim() : null;
    }
    if (input.github_repo !== undefined) {
      payload.github_repo = input.github_repo ? input.github_repo.trim() : null;
    }
    if (input.github_default_branch !== undefined) {
      payload.github_default_branch = input.github_default_branch ? input.github_default_branch.trim() : null;
    }
    if (input.github_installation_id !== undefined) {
      payload.github_installation_id = input.github_installation_id;
    }
    if (input.color !== undefined) {
      payload.color = input.color ? input.color.trim() : null;
    }

    const { data, error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", projectId)
      .select(PROJECT_COLUMNS)
      .single();

    if (error) {
      return { project: null, error: new Error(error.message) };
    }

    return { project: data as DevProject, error: null };
  } catch (err) {
    return {
      project: null,
      error: err instanceof Error ? err : new Error("Failed to update project"),
    };
  }
}

export async function deleteProject(
  projectId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to delete project"),
    };
  }
}
