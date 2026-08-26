import { useCallback, useEffect, useState } from "react";
import type {
  CreateGitHubLinkInput,
  GitHubInstallation,
  GitHubRepository,
  ProjectGitHubConfig,
  TaskGitHubLink,
} from "./types";
import {
  deleteInstallation as deleteInstallationDb,
  getInstallations as getInstallationsDb,
  getTaskGitHubLinks,
  linkGitHubItemToTask,
  saveInstallation as saveInstallationDb,
  unlinkGitHubItem,
  updateProjectGitHubRepo,
  updateTaskGitHubLinkMetadata as updateTaskGitHubLinkMetadataDb,
} from "./github";
import {
  connectInstallation as connectInstallationApi,
  getBranches as getBranchesApi,
  getCommits as getCommitsApi,
  getInstallUrl as getInstallUrlApi,
  getIssue as getIssueApi,
  getIssues as getIssuesApi,
  getPullRequest as getPullRequestApi,
  getPullRequests as getPullRequestsApi,
  getRepositories as getRepositoriesApi,
  listAppInstallations as listAppInstallationsApi,
} from "./githubApi";

export interface UseGitHubOptions {
  userId?: string;
  taskId?: string;
  initialLinks?: TaskGitHubLink[];
  onLinksChange?: (links: TaskGitHubLink[]) => void;
}

export function useGitHub(options?: UseGitHubOptions) {
  const { userId, taskId, initialLinks, onLinksChange } = options || {};

  const [installations, setInstallations] = useState<GitHubInstallation[]>([]);
  const [loadingInstallations, setLoadingInstallations] = useState(Boolean(userId));

  const [taskLinks, setTaskLinks] = useState<TaskGitHubLink[]>(() =>
    initialLinks ? [...initialLinks] : []
  );
  const [loadingLinks, setLoadingLinks] = useState(Boolean(taskId && !initialLinks));

  const [error, setError] = useState<string | null>(null);

  // Load installations for user
  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    getInstallationsDb(userId).then(({ installations: data, error: instErr }) => {
      if (!isMounted) return;

      if (instErr) {
        setError(instErr.message);
        setInstallations([]);
      } else {
        setInstallations(data || []);
        setError(null);
      }
      setLoadingInstallations(false);
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Load task links if taskId is provided and initialLinks wasn't supplied
  useEffect(() => {
    if (!taskId || initialLinks) {
      return;
    }

    let isMounted = true;

    getTaskGitHubLinks(taskId).then(({ links: data, error: linksErr }) => {
      if (!isMounted) return;

      if (linksErr) {
        setError(linksErr.message);
        setTaskLinks([]);
      } else {
        setTaskLinks(data || []);
        onLinksChange?.(data || []);
        setError(null);
      }
      setLoadingLinks(false);
    });

    return () => {
      isMounted = false;
    };
  }, [taskId, initialLinks, onLinksChange]);

  // Installation management
  const addInstallation = useCallback(
    async (data: {
      installation_id: number;
      account_login: string;
      account_type?: string;
      account_avatar_url?: string | null;
    }) => {
      if (!userId) return { installation: null, error: new Error("User ID is required") };

      const res = await saveInstallationDb(userId, data);
      if (!res.error && res.installation) {
        setInstallations((prev) => [
          res.installation!,
          ...prev.filter((i) => i.installation_id !== res.installation!.installation_id),
        ]);
      }
      return res;
    },
    [userId]
  );

  const removeInstallation = useCallback(
    async (installationId: number) => {
      if (!userId) return { error: new Error("User ID is required") };

      const res = await deleteInstallationDb(userId, installationId);
      if (!res.error) {
        setInstallations((prev) => prev.filter((i) => i.installation_id !== installationId));
      }
      return res;
    },
    [userId]
  );

  const refreshInstallations = useCallback(async () => {
    if (!userId) return;
    setLoadingInstallations(true);
    const { installations: data, error: instErr } = await getInstallationsDb(userId);
    if (instErr) {
      setError(instErr.message);
    } else {
      setInstallations(data || []);
      setError(null);
    }
    setLoadingInstallations(false);
  }, [userId]);

  // Installation Flow API Fetchers
  const fetchInstallUrl = useCallback(async () => {
    return getInstallUrlApi();
  }, []);

  const fetchAppInstallations = useCallback(async () => {
    return listAppInstallationsApi();
  }, []);

  const connectInstallation = useCallback(
    async (installationId: number) => {
      const res = await connectInstallationApi(installationId);
      if (!res.error && res.installation) {
        const newInst = res.installation;
        setInstallations((prev) => [
          newInst,
          ...prev.filter((i) => i.installation_id !== newInst.installation_id),
        ]);
        setError(null);
      } else if (res.error) {
        setError(res.error.message);
      }
      return res;
    },
    []
  );

  // GitHub API Fetchers
  const fetchRepositories = useCallback(async (installationId: number) => {
    return getRepositoriesApi(installationId);
  }, []);

  const fetchBranches = useCallback(
    async (installationId: number, owner: string, repo: string) => {
      return getBranchesApi(installationId, owner, repo);
    },
    []
  );

  const fetchPullRequests = useCallback(
    async (installationId: number, owner: string, repo: string) => {
      return getPullRequestsApi(installationId, owner, repo);
    },
    []
  );

  const fetchPullRequest = useCallback(
    async (
      installationId: number,
      owner: string,
      repo: string,
      pullNumber: number
    ) => {
      return getPullRequestApi(installationId, owner, repo, pullNumber);
    },
    []
  );

  const fetchIssues = useCallback(
    async (
      installationId: number,
      owner: string,
      repo: string,
      state: "open" | "closed" | "all" = "open"
    ) => {
      return getIssuesApi(installationId, owner, repo, state);
    },
    []
  );

  const fetchIssue = useCallback(
    async (
      installationId: number,
      owner: string,
      repo: string,
      issueNumber: number
    ) => {
      return getIssueApi(installationId, owner, repo, issueNumber);
    },
    []
  );

  const fetchCommits = useCallback(
    async (installationId: number, owner: string, repo: string, sha?: string) => {
      return getCommitsApi(installationId, owner, repo, sha);
    },
    []
  );

  // Project repository connection
  const connectProjectRepository = useCallback(
    async (
      projectId: string,
      repo: GitHubRepository,
      installationId: number
    ) => {
      const config: ProjectGitHubConfig = {
        github_repository_id: repo.id,
        github_owner: repo.owner.login,
        github_repo: repo.name,
        github_default_branch: repo.default_branch || "main",
        github_installation_id: installationId,
      };

      return updateProjectGitHubRepo(projectId, config);
    },
    []
  );

  const disconnectProjectRepository = useCallback(
    async (projectId: string) => {
      return updateProjectGitHubRepo(projectId, null);
    },
    []
  );

  // Task linking
  const linkItem = useCallback(
    async (
      targetTaskId: string,
      input: CreateGitHubLinkInput
    ): Promise<{ link: TaskGitHubLink | null; error: Error | null }> => {
      const { link: created, error: linkErr } = await linkGitHubItemToTask(
        targetTaskId,
        input
      );

      if (linkErr) {
        setError(linkErr.message);
        return { link: null, error: linkErr };
      }

      if (created) {
        setTaskLinks((prev) => {
          let updated: TaskGitHubLink[];
          if (
            created.link_type === "branch" ||
            created.link_type === "pull_request" ||
            created.link_type === "issue"
          ) {
            updated = [
              ...prev.filter((l) => l.link_type !== created.link_type),
              created,
            ];
          } else {
            updated = [...prev.filter((l) => l.id !== created.id), created];
          }
          onLinksChange?.(updated);
          return updated;
        });
        setError(null);
      }

      return { link: created, error: null };
    },
    [onLinksChange]
  );

  const syncTaskLink = useCallback(
    async (
      linkId: string,
      newMetadata: Record<string, unknown>
    ): Promise<{ link: TaskGitHubLink | null; error: Error | null }> => {
      const res = await updateTaskGitHubLinkMetadataDb(linkId, newMetadata);
      if (!res.error && res.link) {
        const updated = res.link;
        setTaskLinks((prev) => {
          const next = prev.map((l) => (l.id === updated.id ? updated : l));
          onLinksChange?.(next);
          return next;
        });
        setError(null);
      } else if (res.error) {
        setError(res.error.message);
      }
      return res;
    },
    [onLinksChange]
  );

  const unlinkItem = useCallback(
    async (linkId: string): Promise<{ error: Error | null }> => {
      const prevLinks = [...taskLinks];
      setTaskLinks((prev) => {
        const next = prev.filter((l) => l.id !== linkId);
        onLinksChange?.(next);
        return next;
      });

      const { error: delErr } = await unlinkGitHubItem(linkId);

      if (delErr) {
        setError(delErr.message);
        setTaskLinks(prevLinks);
        onLinksChange?.(prevLinks);
        return { error: delErr };
      }

      setError(null);
      return { error: null };
    },
    [taskLinks, onLinksChange]
  );

  return {
    installations,
    loadingInstallations,
    taskLinks,
    loadingLinks,
    error,
    addInstallation,
    removeInstallation,
    refreshInstallations,
    fetchInstallUrl,
    fetchAppInstallations,
    connectInstallation,
    fetchRepositories,
    fetchBranches,
    fetchPullRequests,
    fetchPullRequest,
    fetchIssues,
    fetchIssue,
    fetchCommits,
    connectProjectRepository,
    disconnectProjectRepository,
    linkItem,
    syncTaskLink,
    unlinkItem,
  };
}
