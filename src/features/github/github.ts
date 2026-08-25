import { supabase } from "../../lib/supabase/client";
import type {
  CreateGitHubLinkInput,
  GitHubInstallation,
  ProjectGitHubConfig,
  TaskGitHubLink,
} from "./types";

const INSTALLATION_COLUMNS =
  "id, user_id, installation_id, account_login, account_type, account_avatar_url, created_at, updated_at";

const LINK_COLUMNS =
  "id, task_id, link_type, github_id, name, url, metadata, created_at, updated_at";

// ============================================================================
// GitHub Installations (Supabase DB)
// ============================================================================

export async function getInstallations(
  userId: string
): Promise<{ installations: GitHubInstallation[] | null; error: Error | null }> {
  try {
    if (!userId) {
      return { installations: [], error: null };
    }

    const { data, error } = await supabase
      .from("github_installations")
      .select(INSTALLATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { installations: null, error: new Error(error.message) };
    }

    return { installations: data as GitHubInstallation[], error: null };
  } catch (err) {
    return {
      installations: null,
      error: err instanceof Error ? err : new Error("Failed to fetch installations"),
    };
  }
}

export async function saveInstallation(
  userId: string,
  installation: {
    installation_id: number;
    account_login: string;
    account_type?: string;
    account_avatar_url?: string | null;
  }
): Promise<{ installation: GitHubInstallation | null; error: Error | null }> {
  try {
    if (!userId) {
      return { installation: null, error: new Error("User ID is required") };
    }

    const payload = {
      user_id: userId,
      installation_id: installation.installation_id,
      account_login: installation.account_login,
      account_type: installation.account_type || "User",
      account_avatar_url: installation.account_avatar_url || null,
    };

    const { data, error } = await supabase
      .from("github_installations")
      .upsert(payload, { onConflict: "user_id,installation_id" })
      .select(INSTALLATION_COLUMNS)
      .single();

    if (error) {
      return { installation: null, error: new Error(error.message) };
    }

    return { installation: data as GitHubInstallation, error: null };
  } catch (err) {
    return {
      installation: null,
      error: err instanceof Error ? err : new Error("Failed to save installation"),
    };
  }
}

export async function deleteInstallation(
  userId: string,
  installationId: number
): Promise<{ error: Error | null }> {
  try {
    if (!userId) {
      return { error: new Error("User ID is required") };
    }

    const { error } = await supabase
      .from("github_installations")
      .delete()
      .eq("user_id", userId)
      .eq("installation_id", installationId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to delete installation"),
    };
  }
}

// ============================================================================
// Project GitHub Repository Association
// ============================================================================

export async function updateProjectGitHubRepo(
  projectId: string,
  config: ProjectGitHubConfig | null
): Promise<{ error: Error | null }> {
  try {
    if (!projectId) {
      return { error: new Error("Project ID is required") };
    }

    const payload = {
      github_repository_id: config?.github_repository_id ?? null,
      github_owner: config?.github_owner ?? null,
      github_repo: config?.github_repo ?? null,
      github_default_branch: config?.github_default_branch ?? null,
      github_installation_id: config?.github_installation_id ?? null,
    };

    const { error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", projectId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to update project GitHub repository"),
    };
  }
}

// ============================================================================
// Task GitHub Links (Supabase DB)
// ============================================================================

export async function getTaskGitHubLinks(
  taskId: string
): Promise<{ links: TaskGitHubLink[] | null; error: Error | null }> {
  try {
    if (!taskId) {
      return { links: [], error: null };
    }

    const { data, error } = await supabase
      .from("task_github_links")
      .select(LINK_COLUMNS)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      return { links: null, error: new Error(error.message) };
    }

    return { links: data as TaskGitHubLink[], error: null };
  } catch (err) {
    return {
      links: null,
      error: err instanceof Error ? err : new Error("Failed to fetch task GitHub links"),
    };
  }
}

export async function getAllGitHubLinksForUser(
  userId: string
): Promise<{ links: TaskGitHubLink[] | null; error: Error | null }> {
  try {
    if (!userId) {
      return { links: [], error: null };
    }

    // RLS policy on task_github_links restricts SELECT to rows where tasks.user_id = auth.uid()
    const { data, error } = await supabase
      .from("task_github_links")
      .select(LINK_COLUMNS)
      .order("created_at", { ascending: true });

    if (error) {
      return { links: null, error: new Error(error.message) };
    }

    return { links: data as TaskGitHubLink[], error: null };
  } catch (err) {
    return {
      links: null,
      error: err instanceof Error ? err : new Error("Failed to fetch all user task GitHub links"),
    };
  }
}

export async function linkGitHubItemToTask(
  taskId: string,
  input: CreateGitHubLinkInput
): Promise<{ link: TaskGitHubLink | null; error: Error | null }> {
  try {
    if (!taskId) {
      return { link: null, error: new Error("Task ID is required") };
    }

    // For single-instance link types (e.g. branch, pull_request), if one already exists for this task,
    // we replace or upsert it so a task doesn't accumulate multiple different branches or PRs in V1.
    if (input.link_type === "branch" || input.link_type === "pull_request") {
      await supabase
        .from("task_github_links")
        .delete()
        .eq("task_id", taskId)
        .eq("link_type", input.link_type);
    }

    const payload = {
      task_id: taskId,
      link_type: input.link_type,
      github_id: input.github_id,
      name: input.name,
      url: input.url,
      metadata: input.metadata || {},
    };

    const { data, error } = await supabase
      .from("task_github_links")
      .insert(payload)
      .select(LINK_COLUMNS)
      .single();

    if (error) {
      return { link: null, error: new Error(error.message) };
    }

    return { link: data as TaskGitHubLink, error: null };
  } catch (err) {
    return {
      link: null,
      error: err instanceof Error ? err : new Error("Failed to link GitHub item to task"),
    };
  }
}

export async function unlinkGitHubItem(
  linkId: string
): Promise<{ error: Error | null }> {
  try {
    if (!linkId) {
      return { error: new Error("Link ID is required") };
    }

    const { error } = await supabase
      .from("task_github_links")
      .delete()
      .eq("id", linkId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Failed to unlink GitHub item"),
    };
  }
}
