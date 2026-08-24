export type ProjectStatus = "active" | "completed" | "archived";

export interface DevProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  github_url: string | null;
  github_repository_id: number | null;
  github_owner: string | null;
  github_repo: string | null;
  github_default_branch: string | null;
  github_installation_id: number | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
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
}

export interface UpdateProjectInput {
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
}

export interface ProjectColorOption {
  label: string;
  value: string;
}

export const PRESET_COLORS: readonly ProjectColorOption[] = [
  { label: "Purple", value: "#a855f7" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Slate", value: "#64748b" },
] as const;
