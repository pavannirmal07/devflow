import { useState } from "react";
import {
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGitHub } from "../useGitHub";
import type {
  GitHubBranch,
  GitHubCommit,
  GitHubPullRequest,
  ProjectGitHubConfig,
  TaskGitHubLink,
} from "../types";
import { GitHubIcon } from "./GitHubIcon";
import "../github.css";

export interface TaskGitHubSectionProps {
  taskId: string;
  projectConfig?: ProjectGitHubConfig | null;
  initialLinks?: TaskGitHubLink[];
  onLinksChange?: (links: TaskGitHubLink[]) => void;
  disabled?: boolean;
}

export function TaskGitHubSection({
  taskId,
  projectConfig,
  initialLinks,
  onLinksChange,
  disabled = false,
}: TaskGitHubSectionProps) {
  const {
    taskLinks,
    loadingLinks,
    fetchBranches,
    fetchPullRequests,
    fetchCommits,
    linkItem,
    unlinkItem,
  } = useGitHub({
    taskId,
    initialLinks,
    onLinksChange,
  });

  const [activePicker, setActivePicker] = useState<"branch" | "pr" | "commit" | null>(null);

  // Pickers data
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const hasRepo = Boolean(
    projectConfig?.github_owner &&
      projectConfig?.github_repo &&
      projectConfig?.github_installation_id
  );

  const owner = projectConfig?.github_owner || "";
  const repo = projectConfig?.github_repo || "";
  const installationId = projectConfig?.github_installation_id || 0;
  const repoFullName = `${owner}/${repo}`;

  const branchLink = taskLinks.find((l) => l.link_type === "branch");
  const prLink = taskLinks.find((l) => l.link_type === "pull_request");
  const commitLinks = taskLinks.filter((l) => l.link_type === "commit");

  const openBranchPicker = async () => {
    if (!hasRepo || disabled) return;
    setActivePicker("branch");
    setLoadingPicker(true);
    setPickerError(null);

    const { branches: data, error } = await fetchBranches(installationId, owner, repo);
    if (error) {
      setPickerError(error.message);
      setBranches([]);
    } else {
      setBranches(data);
      setPickerError(null);
    }
    setLoadingPicker(false);
  };

  const openPrPicker = async () => {
    if (!hasRepo || disabled) return;
    setActivePicker("pr");
    setLoadingPicker(true);
    setPickerError(null);

    const { pullRequests: data, error } = await fetchPullRequests(installationId, owner, repo);
    if (error) {
      setPickerError(error.message);
      setPullRequests([]);
    } else {
      setPullRequests(data);
      setPickerError(null);
    }
    setLoadingPicker(false);
  };

  const openCommitPicker = async () => {
    if (!hasRepo || disabled) return;
    setActivePicker("commit");
    setLoadingPicker(true);
    setPickerError(null);

    // If branch is already linked, fetch commits for that branch
    const branchSha = branchLink?.name;
    const { commits: data, error } = await fetchCommits(
      installationId,
      owner,
      repo,
      branchSha
    );

    if (error) {
      setPickerError(error.message);
      setCommits([]);
    } else {
      setCommits(data);
      setPickerError(null);
    }
    setLoadingPicker(false);
  };

  const handleSelectBranch = async (branch: GitHubBranch) => {
    await linkItem(taskId, {
      task_id: taskId,
      link_type: "branch",
      github_id: branch.name,
      name: branch.name,
      url: `https://github.com/${repoFullName}/tree/${encodeURIComponent(branch.name)}`,
      metadata: {
        branch_name: branch.name,
        commit_sha: branch.commit.sha,
        repo_full_name: repoFullName,
      },
    });
    setActivePicker(null);
  };

  const handleSelectPr = async (pr: GitHubPullRequest) => {
    await linkItem(taskId, {
      task_id: taskId,
      link_type: "pull_request",
      github_id: String(pr.number),
      name: `#${pr.number} ${pr.title}`,
      url: pr.html_url,
      metadata: {
        pr_number: pr.number,
        pr_state: pr.merged_at ? "merged" : pr.state,
        branch_name: pr.head.ref,
        repo_full_name: repoFullName,
      },
    });
    setActivePicker(null);
  };

  const handleSelectCommit = async (commit: GitHubCommit) => {
    const shortSha = commit.sha.substring(0, 7);
    const shortMsg = commit.commit.message.split("\n")[0];

    await linkItem(taskId, {
      task_id: taskId,
      link_type: "commit",
      github_id: commit.sha,
      name: `${shortSha}: ${shortMsg}`,
      url: commit.html_url,
      metadata: {
        commit_sha: commit.sha,
        commit_author: commit.commit.author.name,
        repo_full_name: repoFullName,
      },
    });
    setActivePicker(null);
  };

  return (
    <div className="devflow-github-task-section">
      <div className="devflow-github-section-header">
        <div className="flex items-center gap-2">
          <GitHubIcon className="size-4 text-foreground shrink-0" />
          <span className="devflow-field-label m-0 text-sm font-semibold">
            GitHub Development
          </span>
        </div>
        {hasRepo && (
          <span className="text-[11px] text-muted-foreground font-mono truncate max-w-44">
            {repoFullName}
          </span>
        )}
      </div>

      {!hasRepo ? (
        <div className="devflow-github-no-repo-banner">
          <p className="text-xs text-muted-foreground">
            No GitHub repository connected to this project. Connect one in Project settings to attach development branches, PRs, and commits.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Linked Items List */}
          {loadingLinks && taskLinks.length === 0 ? (
            <div className="py-2 text-xs text-muted-foreground">Loading development links...</div>
          ) : (
            <div className="devflow-github-links-container">
              {/* Branch Section */}
              {branchLink && (
                <div className="devflow-github-item-group flex flex-col gap-1.5 w-full">
                  <span className="devflow-github-item-label text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Branch
                  </span>
                  <div className="devflow-github-link-row flex flex-row items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-code-bg w-full min-w-0 flex-nowrap">
                    <div className="devflow-github-link-info flex flex-row items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <GitBranch className="size-4 text-accent shrink-0" />
                      <a
                        href={branchLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono font-medium text-foreground hover:underline truncate min-w-0 flex-1"
                        title={`Open branch ${branchLink.name} on GitHub`}
                      >
                        {branchLink.name}
                      </a>
                      <a
                        href={branchLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent shrink-0 p-0.5"
                        title="View on GitHub"
                      >
                        <ExternalLink className="size-3 opacity-70" />
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => unlinkItem(branchLink.id)}
                      disabled={disabled}
                      className="devflow-github-delete-btn h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-auto flex items-center gap-1"
                      title="Unlink branch"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Pull Request Section */}
              {prLink && (
                <div className="devflow-github-item-group flex flex-col gap-1.5 w-full">
                  <span className="devflow-github-item-label text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pull Request
                  </span>
                  <div className="devflow-github-link-row flex flex-row items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-code-bg w-full min-w-0 flex-nowrap">
                    <div className="devflow-github-link-info flex flex-row items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <GitPullRequest
                        className={`size-4 devflow-pr-icon is-${prLink.metadata?.pr_state || "open"} shrink-0`}
                      />
                      <span
                        className={`devflow-pr-badge shrink-0 is-${prLink.metadata?.pr_state || "open"}`}
                      >
                        {prLink.metadata?.pr_state || "open"}
                      </span>
                      <a
                        href={prLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-foreground hover:underline truncate min-w-0 flex-1"
                        title={`Open PR ${prLink.name} on GitHub`}
                      >
                        {prLink.name}
                      </a>
                      <a
                        href={prLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent shrink-0 p-0.5"
                        title="View on GitHub"
                      >
                        <ExternalLink className="size-3 opacity-70" />
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => unlinkItem(prLink.id)}
                      disabled={disabled}
                      className="devflow-github-delete-btn h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-auto flex items-center gap-1"
                      title="Unlink pull request"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Commits Section */}
              {commitLinks.length > 0 && (
                <div className="devflow-github-item-group flex flex-col gap-1.5 w-full">
                  <span className="devflow-github-item-label text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Commits ({commitLinks.length})
                  </span>
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                    {commitLinks.map((commit) => (
                      <div key={commit.id} className="devflow-github-link-row flex flex-row items-center justify-between gap-3 p-2 rounded-lg border border-border bg-code-bg w-full min-w-0 flex-nowrap">
                        <div className="devflow-github-link-info flex flex-row items-center gap-2 min-w-0 flex-1 overflow-hidden">
                          <GitCommit className="size-4 text-muted-foreground shrink-0" />
                          <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-foreground hover:underline truncate min-w-0 flex-1"
                            title={`Open commit ${commit.name} on GitHub`}
                          >
                            {commit.name}
                          </a>
                          <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-accent shrink-0 p-0.5"
                            title="View on GitHub"
                          >
                            <ExternalLink className="size-3 opacity-70" />
                          </a>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => unlinkItem(commit.id)}
                          disabled={disabled}
                          className="devflow-github-delete-btn h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-auto flex items-center gap-1"
                          title="Unlink commit"
                        >
                          <Trash2 className="size-3" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons Row */}
          {!activePicker && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {!branchLink && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={openBranchPicker}
                  disabled={disabled}
                  className="devflow-btn-secondary h-7 px-2.5 text-xs"
                >
                  <Plus className="size-3 mr-1" />
                  <span>Add Branch</span>
                </Button>
              )}

              {!prLink && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={openPrPicker}
                  disabled={disabled}
                  className="devflow-btn-secondary h-7 px-2.5 text-xs"
                >
                  <Plus className="size-3 mr-1" />
                  <span>Add Pull Request</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={openCommitPicker}
                disabled={disabled}
                className="devflow-btn-secondary h-7 px-2.5 text-xs"
              >
                <Plus className="size-3 mr-1" />
                <span>Add Commit</span>
              </Button>
            </div>
          )}

          {/* Active Picker Popover / Dropdown Drawer */}
          {activePicker && (
            <div className="devflow-github-picker-container p-2.5 rounded-lg border border-border bg-code-bg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {activePicker === "branch" && "Select Git Branch"}
                  {activePicker === "pr" && "Select Pull Request"}
                  {activePicker === "commit" && "Select Commit"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setActivePicker(null)}
                  className="size-5"
                >
                  <X className="size-3" />
                </Button>
              </div>

              {loadingPicker ? (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin text-accent" />
                  <span>Loading from GitHub...</span>
                </div>
              ) : pickerError ? (
                <p className="text-xs text-destructive py-1">{pickerError}</p>
              ) : (
                <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                  {activePicker === "branch" &&
                    (branches.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">No branches found</p>
                    ) : (
                      branches.map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => handleSelectBranch(b)}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-background text-left text-xs font-medium text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <GitBranch className="size-3.5 text-accent shrink-0" />
                            <span className="truncate">{b.name}</span>
                          </div>
                        </button>
                      ))
                    ))}

                  {activePicker === "pr" &&
                    (pullRequests.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">No pull requests found</p>
                    ) : (
                      pullRequests.map((pr) => (
                        <button
                          key={pr.id}
                          type="button"
                          onClick={() => handleSelectPr(pr)}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-background text-left text-xs text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <GitPullRequest className="size-3.5 text-emerald-500 shrink-0" />
                            <span className="font-semibold shrink-0">#{pr.number}</span>
                            <span className="truncate">{pr.title}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                            {pr.state}
                          </span>
                        </button>
                      ))
                    ))}

                  {activePicker === "commit" &&
                    (commits.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">No commits found</p>
                    ) : (
                      commits.map((c) => (
                        <button
                          key={c.sha}
                          type="button"
                          onClick={() => handleSelectCommit(c)}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-background text-left text-xs font-mono text-foreground transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <GitCommit className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="text-accent font-semibold shrink-0">
                              {c.sha.substring(0, 7)}
                            </span>
                            <span className="truncate font-sans text-xs">
                              {c.commit.message.split("\n")[0]}
                            </span>
                          </div>
                        </button>
                      ))
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
