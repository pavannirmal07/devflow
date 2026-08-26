export interface GitHubInstallation {
  id: string;
  user_id: string;
  installation_id: number;
  account_login: string;
  account_type: string;
  account_avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  html_url: string;
  default_branch: string;
  private: boolean;
  description: string | null;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected?: boolean;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  merged_at: string | null;
  created_at: string;
  user: {
    login: string;
    avatar_url?: string;
  };
  head: {
    ref: string;
    sha: string;
  };
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
  author?: {
    login: string;
    avatar_url?: string;
  } | null;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  body: string | null;
  user: {
    login: string;
    avatar_url?: string;
  };
  labels?: Array<{
    id: number;
    name: string;
    color: string;
    description?: string | null;
  }>;
  created_at: string;
  closed_at: string | null;
}

export type TaskGitHubLinkType = "branch" | "pull_request" | "commit" | "issue";

export interface TaskGitHubLink {
  id: string;
  task_id: string;
  link_type: TaskGitHubLinkType;
  github_id: string;
  name: string;
  url: string;
  metadata: {
    pr_number?: number;
    pr_state?: "open" | "closed" | "merged" | "unavailable";
    commit_sha?: string;
    commit_author?: string;
    branch_name?: string;
    repo_full_name?: string;
    issue_number?: number;
    issue_state?: "open" | "closed" | "unavailable";
    issue_labels?: string[];
    issue_author?: string;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateGitHubLinkInput {
  task_id: string;
  link_type: TaskGitHubLinkType;
  github_id: string;
  name: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectGitHubConfig {
  github_repository_id: number | null;
  github_owner: string | null;
  github_repo: string | null;
  github_default_branch: string | null;
  github_installation_id: number | null;
}
