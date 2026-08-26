import { useState, useCallback, useEffect, useMemo } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  GitBranch,
  GitFork,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Unlink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGitHub } from "../useGitHub";
import type { GitHubRepository, ProjectGitHubConfig } from "../types";
import { GitHubIcon } from "./GitHubIcon";
import "../github.css";

export interface ProjectGitHubSectionProps {
  userId?: string;
  config: ProjectGitHubConfig;
  onChange: (config: ProjectGitHubConfig) => void;
  disabled?: boolean;
}

export function ProjectGitHubSection({
  userId,
  config,
  onChange,
  disabled = false,
}: ProjectGitHubSectionProps) {
  const {
    installations,
    loadingInstallations,
    refreshInstallations,
    fetchInstallUrl,
    fetchAppInstallations,
    connectInstallation,
    fetchRepositories,
  } = useGitHub({ userId });

  const [selectedInstId, setSelectedInstId] = useState<number | null>(
    config.github_installation_id || null
  );
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isSelectingRepo, setIsSelectingRepo] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");

  // App Installation Flow States
  const [isInstallingApp, setIsInstallingApp] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [discoveredInstallations, setDiscoveredInstallations] = useState<
    Array<{
      installation_id: number;
      account_login: string;
      account_type: string;
      account_avatar_url: string | null;
    }>
  >([]);
  const [loadingDiscovered, setLoadingDiscovered] = useState(false);
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [manualInstId, setManualInstId] = useState("");
  const [connectingInstId, setConnectingInstId] = useState<number | null>(null);

  const activeInstId =
    selectedInstId ||
    config.github_installation_id ||
    (installations.length > 0 ? installations[0].installation_id : null);

  const loadReposForInstallation = useCallback(
    async (instId: number) => {
      setLoadingRepos(true);
      setRepoError(null);
      const { repositories: repos, error } = await fetchRepositories(instId);
      if (error) {
        setRepoError(error.message);
        setRepositories([]);
      } else {
        setRepositories(repos);
        setRepoError(null);
      }
      setLoadingRepos(false);
    },
    [fetchRepositories]
  );

  // Automatically load repositories when selecting mode is open and an active installation ID exists
  useEffect(() => {
    if (!isSelectingRepo || !activeInstId) {
      return;
    }

    let isMounted = true;

    fetchRepositories(activeInstId).then(({ repositories: repos, error }) => {
      if (!isMounted) return;
      if (error) {
        setRepoError(error.message);
        setRepositories([]);
      } else {
        setRepositories(repos);
        setRepoError(null);
      }
      setLoadingRepos(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isSelectingRepo, activeInstId, fetchRepositories]);

  // Connect a specific installation ID to the user's account
  const handleConnectInstallationId = useCallback(
    async (instId: number) => {
      if (!instId || isNaN(instId)) return;
      setConnectingInstId(instId);
      setInstallError(null);

      const { installation, error } = await connectInstallation(instId);
      setConnectingInstId(null);

      if (error || !installation) {
        setInstallError(error?.message || "Failed to link installation to user");
      } else {
        await refreshInstallations();
        setSelectedInstId(instId);
        setIsInstallingApp(false);
        setShowManualConnect(false);
        setManualInstId("");
        setIsSelectingRepo(true);
      }
    },
    [connectInstallation, refreshInstallations]
  );

  // Check URL parameters for post-installation callback (e.g. ?installation_id=123)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const instIdParam = searchParams.get("installation_id");
    if (instIdParam) {
      const id = parseInt(instIdParam, 10);
      if (id > 0) {
        // Clean URL parameter without reloading
        searchParams.delete("installation_id");
        searchParams.delete("setup_action");
        const newUrl =
          window.location.pathname +
          (searchParams.toString() ? `?${searchParams.toString()}` : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);

        // Defer connection call to avoid synchronous setState during initial render
        Promise.resolve().then(() => {
          void handleConnectInstallationId(id);
        });
      }
    }
  }, [handleConnectInstallationId]);

  const handleStartSelecting = () => {
    setIsSelectingRepo(true);
    setRepoSearchQuery("");
    setLoadingRepos(true);
  };

  const handleSelectRepository = (repo: GitHubRepository) => {
    onChange({
      github_repository_id: repo.id,
      github_owner: repo.owner.login,
      github_repo: repo.name,
      github_default_branch: repo.default_branch || "main",
      github_installation_id: activeInstId,
    });
    setIsSelectingRepo(false);
    setRepoSearchQuery("");
  };

  const handleDisconnect = () => {
    onChange({
      github_repository_id: null,
      github_owner: null,
      github_repo: null,
      github_default_branch: null,
      github_installation_id: null,
    });
    setIsSelectingRepo(false);
    setRepoSearchQuery("");
  };

  // Filtered repositories according to user search query
  const filteredRepositories = useMemo(() => {
    const q = repoSearchQuery.trim().toLowerCase();
    if (!q) return repositories;
    return repositories.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        r.owner.login.toLowerCase().includes(q)
    );
  }, [repositories, repoSearchQuery]);

  // Discover installations from GitHub App API
  const handleDiscoverAppInstallations = async () => {
    setLoadingDiscovered(true);
    const { installations: found, error } = await fetchAppInstallations();
    if (!error && found) {
      setDiscoveredInstallations(found);
    }
    setLoadingDiscovered(false);
  };

  // Initiate GitHub App installation flow
  const handleInitiateInstall = async () => {
    setIsInstallingApp(true);
    setInstallError(null);

    const { installUrl, error, notConfigured } = await fetchInstallUrl();

    if (notConfigured) {
      setInstallError(
        "GitHub integration is not yet configured on the server. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY."
      );
      setIsInstallingApp(false);
      return;
    }

    if (error || !installUrl) {
      setInstallError(
        error?.message || "Failed to generate GitHub App installation URL"
      );
      setIsInstallingApp(false);
      return;
    }

    // Open GitHub App installation in a new tab
    window.open(installUrl, "_blank", "noopener,noreferrer");

    // Fetch existing accessible installations on GitHub in case user already installed
    void handleDiscoverAppInstallations();
  };

  const handleManualConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(manualInstId.trim(), 10);
    if (!id || isNaN(id)) return;
    await handleConnectInstallationId(id);
  };

  const isConnected = Boolean(config.github_owner && config.github_repo);
  const repoFullName = isConnected
    ? `${config.github_owner}/${config.github_repo}`
    : null;
  const repoUrl = isConnected
    ? `https://github.com/${config.github_owner}/${config.github_repo}`
    : null;

  return (
    <div className="devflow-github-project-section">
      {/* Header */}
      <div className="devflow-github-section-header">
        <div className="flex items-center gap-2">
          <GitHubIcon className="size-4 text-foreground shrink-0" />
          <span className="devflow-field-label m-0 text-sm font-semibold">
            GitHub Repository
          </span>
        </div>
        {isConnected && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleDisconnect}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
          >
            <Unlink className="size-3 mr-1" />
            <span>Disconnect</span>
          </Button>
        )}
      </div>

      {isSelectingRepo ? (
        /* Repository Selector Mode */
        <div className="devflow-github-selector-card">
          {/* Installation selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="github-installation-select"
                className="text-xs font-medium text-muted-foreground"
              >
                Connected GitHub Account
              </label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 text-[11px] px-1 text-accent"
                onClick={handleInitiateInstall}
              >
                <Plus className="size-2.5 mr-0.5" />
                <span>Add / Install Account</span>
              </Button>
            </div>

            {loadingInstallations ? (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading accounts...</span>
              </div>
            ) : installations.length === 0 ? (
              <div className="p-3 border border-dashed border-border rounded-lg text-center bg-code-bg">
                <p className="text-xs text-muted-foreground mb-2">
                  No GitHub account connected yet.
                </p>
                <Button
                  type="button"
                  className="devflow-btn-primary text-xs h-7"
                  onClick={handleInitiateInstall}
                >
                  <GitHubIcon className="size-3 mr-1.5" />
                  <span>Install GitHub App</span>
                </Button>
              </div>
            ) : (
              <select
                id="github-installation-select"
                value={activeInstId || ""}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseInt(e.target.value, 10)
                    : null;
                  setSelectedInstId(val);
                  setRepoSearchQuery("");
                }}
                className="devflow-task-select text-xs py-1.5"
                disabled={disabled}
              >
                <option value="">-- Choose Account --</option>
                {installations.map((inst) => (
                  <option key={inst.id} value={inst.installation_id}>
                    {inst.account_login} ({inst.account_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Repositories list with Search */}
          {activeInstId && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Available Repositories
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    if (selectedInstId) {
                      void loadReposForInstallation(selectedInstId);
                    }
                  }}
                  title="Refresh repositories"
                  className="size-5"
                >
                  <RefreshCw
                    className={`size-3 ${loadingRepos ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>

              {/* Repository Search Filter Input */}
              <div className="relative flex items-center">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={repoSearchQuery}
                  onChange={(e) => setRepoSearchQuery(e.target.value)}
                  className="devflow-github-search-input"
                  disabled={disabled || loadingRepos}
                />
                {repoSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRepoSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    aria-label="Clear search"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {loadingRepos ? (
                <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground justify-center">
                  <Loader2 className="size-4 animate-spin text-accent" />
                  <span>Loading repositories...</span>
                </div>
              ) : repoError ? (
                <p className="text-xs text-destructive py-2">{repoError}</p>
              ) : repositories.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic text-center">
                  No repositories found for this account.
                </p>
              ) : (
                <div className="devflow-github-repos-list max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
                  {/* Option to leave unconnected / clear selection */}
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="devflow-github-repo-item flex items-center justify-between p-2 rounded-md hover:bg-code-bg border border-dashed border-border/70 text-left transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Unlink className="size-3 shrink-0 opacity-70" />
                      <span className="text-xs font-medium truncate">
                        No repository (leave unconnected)
                      </span>
                    </div>
                  </button>

                  {filteredRepositories.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center italic">
                      No repositories matching &ldquo;{repoSearchQuery}&rdquo;
                    </p>
                  ) : (
                    filteredRepositories.map((repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => handleSelectRepository(repo)}
                        className="devflow-github-repo-item flex items-center justify-between p-2 rounded-md hover:bg-code-bg border border-transparent hover:border-border text-left transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {repo.private ? (
                            <Lock className="size-3 text-muted-foreground shrink-0" />
                          ) : (
                            <GitFork className="size-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs font-medium text-foreground truncate">
                            {repo.full_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2 font-mono">
                          {repo.default_branch}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-xs h-7"
              onClick={() => {
                setIsSelectingRepo(false);
                setRepoSearchQuery("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : isConnected ? (
        /* Connected Repository Card */
        <div className="devflow-github-connected-card">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <GitFork className="w-4 h-4 text-accent shrink-0" />
                <a
                  href={repoUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="devflow-github-repo-link truncate font-semibold text-sm hover:underline"
                  title={`Open https://github.com/${repoFullName} in new tab`}
                >
                  {repoFullName}
                </a>
                <ExternalLink className="size-3 text-muted-foreground shrink-0 opacity-70" />
              </div>

              <span className="devflow-github-branch-pill text-xs shrink-0">
                <GitBranch className="size-3.5 mr-1 opacity-70" />
                <span>{config.github_default_branch || "main"}</span>
              </span>
            </div>

            <div className="shrink-0 ml-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleStartSelecting}
                disabled={disabled}
                className="devflow-btn-secondary h-7 px-3 text-xs shrink-0"
              >
                Change
              </Button>
            </div>
          </div>
        </div>
      ) : loadingInstallations ? (
        /* Loading Installations State */
        <div className="devflow-github-unlinked-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Checking GitHub connection...</span>
          </div>
        </div>
      ) : installations.length > 0 ? (
        /* Account Connected, but No Repository Selected for this Project */
        <div className="devflow-github-unlinked-card">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <GitHubIcon className="size-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground">
                No repository selected
              </span>
              <span className="text-[11.5px] text-muted-foreground truncate">
                Connected to {installations[0]?.account_login}
                {installations.length > 1
                  ? ` (+${installations.length - 1} more)`
                  : ""}
              </span>
            </div>
          </div>

          <Button
            type="button"
            className="devflow-btn-primary h-7 px-3 text-xs shrink-0"
            onClick={handleStartSelecting}
            disabled={disabled}
          >
            <span>Select Repository</span>
          </Button>
        </div>
      ) : (
        /* No GitHub App Account Connected to User Profile */
        <div className="devflow-github-empty-state flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <GitHubIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold text-foreground">
                GitHub App Not Connected
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                Connect the DevFlow GitHub App to link repositories, branches,
                pull requests, and commits to your projects and tasks.
              </p>
            </div>
          </div>

          {/* Installation Error Banner */}
          {installError && (
            <div
              className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{installError}</span>
            </div>
          )}

          {/* Installation in progress UI */}
          {isInstallingApp ? (
            <div className="p-3 border border-border rounded-lg bg-code-bg flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Loader2 className="size-4 animate-spin text-accent" />
                <span>Waiting for GitHub installation...</span>
              </div>
              <p className="text-xs text-muted-foreground">
                A new tab has opened to install the GitHub App. After selecting
                your repositories on GitHub, return here and choose your
                account:
              </p>

              {loadingDiscovered ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground justify-center">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Checking for installations...</span>
                </div>
              ) : discoveredInstallations.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Available Installations
                  </span>
                  {discoveredInstallations.map((inst) => (
                    <div
                      key={inst.installation_id}
                      className="flex items-center justify-between p-2 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {inst.account_avatar_url ? (
                          <img
                            src={inst.account_avatar_url}
                            alt=""
                            className="size-5 rounded-full"
                          />
                        ) : (
                          <GitHubIcon className="size-4 text-foreground" />
                        )}
                        <span className="text-xs font-medium text-foreground truncate">
                          {inst.account_login} ({inst.account_type})
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        className="devflow-btn-primary h-6 text-xs px-2.5"
                        onClick={() =>
                          handleConnectInstallationId(inst.installation_id)
                        }
                        disabled={connectingInstId === inst.installation_id}
                      >
                        {connectingInstId === inst.installation_id ? (
                          <Loader2 className="size-3 animate-spin mr-1" />
                        ) : (
                          <Check className="size-3 mr-1" />
                        )}
                        <span>Connect</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="devflow-btn-secondary text-xs h-7"
                    onClick={handleDiscoverAppInstallations}
                  >
                    <RefreshCw className="size-3 mr-1" />
                    <span>Check Again</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-xs h-7 text-muted-foreground"
                    onClick={() => setShowManualConnect((prev) => !prev)}
                  >
                    Enter Installation ID
                  </Button>
                </div>
              )}

              {showManualConnect && (
                <form
                  onSubmit={handleManualConnectSubmit}
                  className="flex gap-2 mt-2 pt-2 border-t border-border"
                >
                  <input
                    type="number"
                    placeholder="Installation ID (e.g. 12345678)"
                    value={manualInstId}
                    onChange={(e) => setManualInstId(e.target.value)}
                    className="devflow-github-input text-xs flex-1"
                  />
                  <Button
                    type="submit"
                    className="devflow-btn-primary h-7 text-xs px-3"
                    disabled={!manualInstId || connectingInstId !== null}
                  >
                    Connect
                  </Button>
                </form>
              )}

              <div className="flex justify-end mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-xs h-6 text-muted-foreground"
                  onClick={() => setIsInstallingApp(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-start">
              <Button
                type="button"
                className="devflow-btn-primary h-7 px-3 text-xs gap-1.5"
                onClick={handleInitiateInstall}
                disabled={disabled}
              >
                <GitHubIcon className="size-3" />
                <span>Connect GitHub App</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
