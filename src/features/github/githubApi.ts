import {
  supabase,
  supabasePublishableKey,
  supabaseUrl,
} from "../../lib/supabase/client";
import type {
  GitHubBranch,
  GitHubCommit,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepository,
} from "./types";

interface FunctionResponse<T> {
  data?: T;
  error?: string;
  configured?: boolean;
  status?: number;
}

async function invokeGitHubFunction<T>(
  action: string,
  params: Record<string, string>
): Promise<{
  data: T | null;
  error: Error | null;
  notConfigured?: boolean;
  statusCode?: number;
  isUnavailable?: boolean;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        data: null,
        error: new Error("User must be authenticated to access GitHub"),
      };
    }

    const queryParams = new URLSearchParams({
      action,
      ...params,
    });

    const endpoint = `${supabaseUrl}/functions/v1/github-integration?${queryParams.toString()}`;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabasePublishableKey,
      },
    });

    let resBody: FunctionResponse<T> | null = null;
    try {
      resBody = (await res.json()) as FunctionResponse<T>;
    } catch {
      // Non-JSON response
    }

    const statusCode = resBody?.status || res.status;
    const isUnavailable =
      statusCode === 404 ||
      statusCode === 410 ||
      Boolean(resBody?.error?.includes("410") || resBody?.error?.includes("404"));

    if (res.status === 503 || resBody?.configured === false) {
      return {
        data: null,
        error: new Error(
          resBody?.error ||
            "GitHub integration isn't configured on the server yet."
        ),
        notConfigured: true,
        statusCode: 503,
      };
    }

    if (!res.ok) {
      const errorMessage =
        resBody?.error ||
        `GitHub integration request failed (${res.status})`;
      return {
        data: null,
        error: new Error(errorMessage),
        statusCode,
        isUnavailable,
      };
    }

    if (resBody?.error) {
      return {
        data: null,
        error: new Error(resBody.error),
        statusCode,
        isUnavailable,
      };
    }

    return {
      data: (resBody?.data ?? null) as T | null,
      error: null,
      statusCode,
      isUnavailable: false,
    };
  } catch (err) {
    return {
      data: null,
      error:
        err instanceof Error
          ? err
          : new Error("Failed to communicate with GitHub integration service"),
    };
  }
}

// Public API Calls

export async function getInstallUrl(): Promise<{
  installUrl: string | null;
  appSlug?: string;
  appName?: string;
  error: Error | null;
  notConfigured?: boolean;
}> {
  const { data, error, notConfigured } = await invokeGitHubFunction<{
    install_url: string;
    app_slug: string;
    app_name: string;
    app_id: string;
  }>("get_install_url", {});

  if (error || notConfigured) {
    return {
      installUrl: null,
      error,
      notConfigured,
    };
  }

  return {
    installUrl: data?.install_url || null,
    appSlug: data?.app_slug,
    appName: data?.app_name,
    error: null,
  };
}

export async function listAppInstallations(): Promise<{
  installations: Array<{
    installation_id: number;
    account_login: string;
    account_type: string;
    account_avatar_url: string | null;
  }>;
  error: Error | null;
}> {
  const { data, error } = await invokeGitHubFunction<{
    installations: Array<{
      installation_id: number;
      account_login: string;
      account_type: string;
      account_avatar_url: string | null;
    }>;
  }>("app_installations", {});

  if (error) {
    return { installations: [], error };
  }

  return {
    installations: data?.installations || [],
    error: null,
  };
}

export async function connectInstallation(
  installationId: number
): Promise<{
  installation: {
    id: string;
    user_id: string;
    installation_id: number;
    account_login: string;
    account_type: string;
    account_avatar_url: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  error: Error | null;
}> {
  if (!installationId) {
    return {
      installation: null,
      error: new Error("Installation ID is required"),
    };
  }

  const { data, error } = await invokeGitHubFunction<{
    installation: {
      id: string;
      user_id: string;
      installation_id: number;
      account_login: string;
      account_type: string;
      account_avatar_url: string | null;
      created_at: string;
      updated_at: string;
    };
  }>("connect_installation", {
    installation_id: String(installationId),
  });

  if (error) {
    return { installation: null, error };
  }

  return {
    installation: data?.installation || null,
    error: null,
  };
}

export async function getRepositories(
  installationId: number
): Promise<{ repositories: GitHubRepository[]; error: Error | null }> {
  if (!installationId) {
    return {
      repositories: [],
      error: new Error("GitHub installation ID is required"),
    };
  }

  const { data, error } = await invokeGitHubFunction<
    { repositories: GitHubRepository[] } | GitHubRepository[]
  >("repositories", {
    installation_id: String(installationId),
  });

  if (error) {
    return { repositories: [], error };
  }

  const repos = Array.isArray(data)
    ? data
    : data?.repositories || [];

  return {
    repositories: repos,
    error: null,
  };
}

export async function getBranches(
  installationId: number,
  owner: string,
  repo: string
): Promise<{ branches: GitHubBranch[]; error: Error | null }> {
  if (!installationId || !owner || !repo) {
    return {
      branches: [],
      error: new Error("Installation ID, repository owner, and name are required"),
    };
  }

  const { data, error } = await invokeGitHubFunction<GitHubBranch[]>(
    "branches",
    {
      installation_id: String(installationId),
      owner,
      repo,
    }
  );

  if (error) {
    return { branches: [], error };
  }

  return {
    branches: Array.isArray(data) ? data : [],
    error: null,
  };
}

export async function getPullRequests(
  installationId: number,
  owner: string,
  repo: string
): Promise<{ pullRequests: GitHubPullRequest[]; error: Error | null }> {
  if (!installationId || !owner || !repo) {
    return {
      pullRequests: [],
      error: new Error("Installation ID, repository owner, and name are required"),
    };
  }

  const { data, error } = await invokeGitHubFunction<GitHubPullRequest[]>(
    "pulls",
    {
      installation_id: String(installationId),
      owner,
      repo,
    }
  );

  if (error) {
    return { pullRequests: [], error };
  }

  return {
    pullRequests: Array.isArray(data) ? data : [],
    error: null,
  };
}

export async function getCommits(
  installationId: number,
  owner: string,
  repo: string,
  sha?: string
): Promise<{ commits: GitHubCommit[]; error: Error | null }> {
  if (!installationId || !owner || !repo) {
    return {
      commits: [],
      error: new Error("Installation ID, repository owner, and name are required"),
    };
  }

  const params: Record<string, string> = {
    installation_id: String(installationId),
    owner,
    repo,
  };

  if (sha) {
    params.sha = sha;
  }

  const { data, error } = await invokeGitHubFunction<GitHubCommit[]>(
    "commits",
    params
  );

  if (error) {
    return { commits: [], error };
  }

  return {
    commits: Array.isArray(data) ? data : [],
    error: null,
  };
}

export async function getIssues(
  installationId: number,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<{ issues: GitHubIssue[]; error: Error | null }> {
  if (!installationId || !owner || !repo) {
    return {
      issues: [],
      error: new Error("Installation ID, repository owner, and name are required"),
    };
  }

  const { data, error } = await invokeGitHubFunction<GitHubIssue[]>(
    "issues",
    {
      installation_id: String(installationId),
      owner,
      repo,
      state,
    }
  );

  if (error) {
    return { issues: [], error };
  }

  return {
    issues: Array.isArray(data) ? data : [],
    error: null,
  };
}

export async function getPullRequest(
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<{
  pullRequest: GitHubPullRequest | null;
  error: Error | null;
  statusCode?: number;
  isUnavailable?: boolean;
}> {
  if (!installationId || !owner || !repo || !pullNumber) {
    return {
      pullRequest: null,
      error: new Error("Installation ID, repository owner, repo, and pull number are required"),
    };
  }

  const { data, error, statusCode, isUnavailable } =
    await invokeGitHubFunction<GitHubPullRequest>("pull_detail", {
      installation_id: String(installationId),
      owner,
      repo,
      number: String(pullNumber),
    });

  const unavailable =
    Boolean(isUnavailable) ||
    statusCode === 404 ||
    statusCode === 410 ||
    Boolean(error?.message?.includes("410") || error?.message?.includes("404"));

  if (error) {
    return {
      pullRequest: null,
      error,
      statusCode,
      isUnavailable: unavailable,
    };
  }

  return {
    pullRequest: data || null,
    error: null,
    statusCode,
    isUnavailable: false,
  };
}

export async function getIssue(
  installationId: number,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<{
  issue: GitHubIssue | null;
  error: Error | null;
  statusCode?: number;
  isUnavailable?: boolean;
}> {
  if (!installationId || !owner || !repo || !issueNumber) {
    return {
      issue: null,
      error: new Error("Installation ID, repository owner, repo, and issue number are required"),
    };
  }

  const { data, error, statusCode, isUnavailable } =
    await invokeGitHubFunction<GitHubIssue>("issue_detail", {
      installation_id: String(installationId),
      owner,
      repo,
      number: String(issueNumber),
    });

  const unavailable =
    Boolean(isUnavailable) ||
    statusCode === 404 ||
    statusCode === 410 ||
    Boolean(error?.message?.includes("410") || error?.message?.includes("404"));

  if (error) {
    return {
      issue: null,
      error,
      statusCode,
      isUnavailable: unavailable,
    };
  }

  return {
    issue: data || null,
    error: null,
    statusCode,
    isUnavailable: false,
  };
}
