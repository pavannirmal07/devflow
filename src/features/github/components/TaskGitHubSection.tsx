import { useState } from "react";
import {
  AlertCircle,
  Check,
  CircleDot,
  Copy,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGitHub } from "../useGitHub";
import type {
  GitHubBranch,
  GitHubCommit,
  GitHubIssue,
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
    fetchPullRequest,
    fetchIssues,
    fetchIssue,
    fetchCommits,
    linkItem,
    syncTaskLink,
    unlinkItem,
  } = useGitHub({
    taskId,
    initialLinks,
    onLinksChange,
  });

  const [activePicker, setActivePicker] = useState<"branch" | "pr" | "commit" | "issue" | null>(null);

  // Pickers data
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Status syncing state
  const [syncingLinkId, setSyncingLinkId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "info" | "warning" | "error";
    message: string;
  } | null>(null);

  // Branch command copied state
  const [branchCopied, setBranchCopied] = useState(false);

  const hasRepo = Boolean(
    projectConfig?.github_owner &&
      projectConfig?.github_repo &&
      projectConfig?.github_installation_id
  );

  const owner = projectConfig?.github_owner || "";
  const repo = projectConfig?.github_repo || "";
  const installationId = projectConfig?.github_installation_id || 0;
  const repoFullName = `${owner}/${repo}`;

  const issueLink = taskLinks.find((l) => l.link_type === "issue");
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

  const openIssuePicker = async () => {
    if (!hasRepo || disabled) return;
    setActivePicker("issue");
    setLoadingPicker(true);
    setPickerError(null);

    const { issues: data, error } = await fetchIssues(installationId, owner, repo, "all");
    if (error) {
      setPickerError(error.message);
      setIssues([]);
    } else {
      setIssues(data);
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
    const prState = pr.merged_at ? "merged" : pr.state;
    await linkItem(taskId, {
      task_id: taskId,
      link_type: "pull_request",
      github_id: String(pr.number),
      name: `#${pr.number} ${pr.title}`,
      url: pr.html_url,
      metadata: {
        pr_number: pr.number,
        pr_state: prState,
        branch_name: pr.head?.ref,
        repo_full_name: repoFullName,
      },
    });
    setActivePicker(null);
  };

  const handleSelectIssue = async (issue: GitHubIssue) => {
    await linkItem(taskId, {
      task_id: taskId,
      link_type: "issue",
      github_id: String(issue.number),
      name: `#${issue.number} ${issue.title}`,
      url: issue.html_url,
      metadata: {
        issue_number: issue.number,
        issue_state: issue.state,
        issue_labels: issue.labels?.map((l) => l.name) || [],
        issue_author: issue.user?.login || "",
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

  const handleCopyBranchCommand = async () => {
    if (!branchLink) return;
    const cmd = `git checkout -b ${branchLink.name}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cmd);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = cmd;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setBranchCopied(true);
      setTimeout(() => setBranchCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSyncPrStatus = async (link: TaskGitHubLink) => {
    if (!hasRepo || disabled || !link.metadata?.pr_number) return;
    const prNum = Number(link.metadata.pr_number);
    setSyncingLinkId(link.id);
    setSyncFeedback(null);

    const { pullRequest, error, isUnavailable } = await fetchPullRequest(
      installationId,
      owner,
      repo,
      prNum
    );

    if (
      isUnavailable ||
      error?.message?.includes("410") ||
      error?.message?.includes("404")
    ) {
      await syncTaskLink(link.id, {
        ...link.metadata,
        pr_state: "unavailable",
      });
      setSyncFeedback({
        type: "warning",
        message: `Pull Request #${prNum} is no longer available on GitHub.`,
      });
      setSyncingLinkId(null);
      return;
    }

    if (error || !pullRequest) {
      setSyncFeedback({
        type: "error",
        message: error?.message || "Failed to fetch live PR status",
      });
      setSyncingLinkId(null);
      return;
    }

    const nextState = pullRequest.merged_at ? "merged" : pullRequest.state;
    await syncTaskLink(link.id, {
      ...link.metadata,
      pr_state: nextState,
      branch_name: pullRequest.head?.ref || link.metadata.branch_name,
    });

    setSyncFeedback({
      type: "info",
      message: `Pull Request #${prNum} status synced (${nextState.toUpperCase()}).`,
    });
    setSyncingLinkId(null);
  };

  const handleSyncIssueStatus = async (link: TaskGitHubLink) => {
    if (!hasRepo || disabled || !link.metadata?.issue_number) return;
    const issueNum = Number(link.metadata.issue_number);
    setSyncingLinkId(link.id);
    setSyncFeedback(null);

    const { issue, error, isUnavailable } = await fetchIssue(
      installationId,
      owner,
      repo,
      issueNum
    );

    if (
      isUnavailable ||
      error?.message?.includes("410") ||
      error?.message?.includes("404")
    ) {
      // 1. Preserve the existing task_github_links record.
      // 2. Mark state as unavailable.
      await syncTaskLink(link.id, {
        ...link.metadata,
        issue_state: "unavailable",
      });
      // 3. User-friendly feedback replacing raw API error
      setSyncFeedback({
        type: "warning",
        message: `Issue #${issueNum} is no longer available on GitHub.`,
      });
      setSyncingLinkId(null);
      return;
    }

    if (error || !issue) {
      setSyncFeedback({
        type: "error",
        message: error?.message || "Failed to fetch live Issue status",
      });
      setSyncingLinkId(null);
      return;
    }

    await syncTaskLink(link.id, {
      ...link.metadata,
      issue_state: issue.state,
      issue_labels: issue.labels?.map((l) => l.name) || link.metadata.issue_labels,
    });

    setSyncFeedback({
      type: "info",
      message: `Issue #${issueNum} status synced (${issue.state.toUpperCase()}).`,
    });
    setSyncingLinkId(null);
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
            No GitHub repository connected to this project. Connect one in Project settings to attach development branches, PRs, issues, and commits.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {syncFeedback && (
            <div
              className={`text-xs rounded p-2 flex items-center justify-between ${
                syncFeedback.type === "warning"
                  ? "text-amber-500 bg-amber-500/10 border border-amber-500/20"
                  : syncFeedback.type === "info"
                  ? "text-accent bg-accent/10 border border-accent/20"
                  : "text-destructive bg-destructive/10 border border-destructive/20"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{syncFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncFeedback(null)}
                className="opacity-70 hover:opacity-100 ml-2 p-0.5"
                aria-label="Dismiss feedback"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          {/* Linked Items List */}
          {loadingLinks && taskLinks.length === 0 ? (
            <div className="py-2 text-xs text-muted-foreground">Loading development links...</div>
          ) : (
            <div className="devflow-github-links-container">
              {/* Issue Section */}
              {issueLink && (
                <div className="devflow-github-item-group flex flex-col gap-1.5 w-full">
                  <span className="devflow-github-item-label text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    GitHub Issue
                  </span>
                  <div className="devflow-github-link-row flex flex-row items-center justify-between gap-2.5 p-2.5 rounded-lg border border-border bg-code-bg w-full min-w-0 flex-nowrap">
                    <div className="devflow-github-link-info flex flex-row items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      {issueLink.metadata?.issue_state === "unavailable" ? (
                        <AlertCircle className="size-4 devflow-issue-icon is-unavailable shrink-0" />
                      ) : (
                        <CircleDot
                          className={`size-4 devflow-issue-icon is-${issueLink.metadata?.issue_state || "open"} shrink-0`}
                        />
                      )}
                      <span
                        className={`devflow-issue-badge shrink-0 is-${issueLink.metadata?.issue_state || "open"}`}
                      >
                        {(issueLink.metadata?.issue_state || "open").toUpperCase()}
                      </span>
                      <a
                        href={issueLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-foreground hover:underline truncate min-w-0 flex-1"
                        title={
                          issueLink.metadata?.issue_state === "unavailable"
                            ? `Issue ${issueLink.name} (no longer available on GitHub)`
                            : `Open Issue ${issueLink.name} on GitHub`
                        }
                      >
                        {issueLink.name}
                      </a>
                      <a
                        href={issueLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent shrink-0 p-0.5"
                        title="View on GitHub"
                      >
                        <ExternalLink className="size-3 opacity-70" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleSyncIssueStatus(issueLink)}
                        disabled={disabled || syncingLinkId === issueLink.id}
                        className="devflow-github-sync-btn h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1"
                        title="Sync Issue status from GitHub"
                      >
                        <RefreshCw
                          className={`size-3.5 ${syncingLinkId === issueLink.id ? "animate-spin text-accent" : ""}`}
                        />
                        <span className="hidden sm:inline">Sync</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => unlinkItem(issueLink.id)}
                        disabled={disabled}
                        className="devflow-github-delete-btn h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 flex items-center gap-1"
                        title="Unlink issue"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Branch Section */}
              {branchLink && (
                <div className="devflow-github-item-group flex flex-col gap-1.5 w-full">
                  <span className="devflow-github-item-label text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Branch
                  </span>
                  <div className="devflow-github-link-row flex flex-row items-center justify-between gap-2.5 p-2.5 rounded-lg border border-border bg-code-bg w-full min-w-0 flex-nowrap">
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
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={handleCopyBranchCommand}
                        disabled={disabled}
                        className={`devflow-github-copy-btn h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1 ${branchCopied ? "text-emerald-500 font-semibold" : ""}`}
                        title="Copy git checkout -b command"
                      >
                        {branchCopied ? (
                          <>
                            <Check className="size-3.5 text-emerald-500" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            <span className="hidden sm:inline">Copy Cmd</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => unlinkItem(branchLink.id)}
                        disabled={disabled}
                        className="devflow-github-delete-btn h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 flex items-center gap-1"
                        title="Unlink branch"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pull Request Section */}
              {prLink && (
                <div className="devflow-github-item-group flex flex-col gap-1.5 w-full">
                  <span className="devflow-github-item-label text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pull Request
                  </span>
                  <div className="devflow-github-link-row flex flex-row items-center justify-between gap-2.5 p-2.5 rounded-lg border border-border bg-code-bg w-full min-w-0 flex-nowrap">
                    <div className="devflow-github-link-info flex flex-row items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <GitPullRequest
                        className={`size-4 devflow-pr-icon is-${prLink.metadata?.pr_state || "open"} shrink-0`}
                      />
                      <span
                        className={`devflow-pr-badge shrink-0 is-${prLink.metadata?.pr_state || "open"}`}
                      >
                        {(prLink.metadata?.pr_state || "open").toUpperCase()}
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
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleSyncPrStatus(prLink)}
                        disabled={disabled || syncingLinkId === prLink.id}
                        className="devflow-github-sync-btn h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1"
                        title="Sync PR status from GitHub"
                      >
                        <RefreshCw
                          className={`size-3.5 ${syncingLinkId === prLink.id ? "animate-spin text-accent" : ""}`}
                        />
                        <span className="hidden sm:inline">Sync</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => unlinkItem(prLink.id)}
                        disabled={disabled}
                        className="devflow-github-delete-btn h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 flex items-center gap-1"
                        title="Unlink pull request"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
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
              {!issueLink && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={openIssuePicker}
                  disabled={disabled}
                  className="devflow-btn-secondary h-7 px-2.5 text-xs"
                >
                  <Plus className="size-3 mr-1" />
                  <span>Add Issue</span>
                </Button>
              )}

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
                  {activePicker === "issue" && "Select GitHub Issue"}
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
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
                  {activePicker === "issue" &&
                    (issues.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">No issues found</p>
                    ) : (
                      issues.map((iss) => (
                        <button
                          key={iss.id}
                          type="button"
                          onClick={() => handleSelectIssue(iss)}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-background text-left text-xs text-foreground transition-colors gap-2"
                        >
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            <CircleDot
                              className={`size-3.5 shrink-0 ${iss.state === "open" ? "text-emerald-500" : "text-purple-400"}`}
                            />
                            <span className="font-semibold shrink-0">#{iss.number}</span>
                            <span className="truncate">{iss.title}</span>
                          </div>
                          <span
                            className={`devflow-issue-badge shrink-0 is-${iss.state}`}
                          >
                            {iss.state.toUpperCase()}
                          </span>
                        </button>
                      ))
                    ))}

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
                          className="flex items-center justify-between p-1.5 rounded hover:bg-background text-left text-xs text-foreground transition-colors gap-2"
                        >
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            <GitPullRequest
                              className={`size-3.5 shrink-0 ${pr.merged_at ? "text-purple-400" : pr.state === "open" ? "text-emerald-500" : "text-muted-foreground"}`}
                            />
                            <span className="font-semibold shrink-0">#{pr.number}</span>
                            <span className="truncate">{pr.title}</span>
                          </div>
                          <span
                            className={`devflow-pr-badge shrink-0 is-${pr.merged_at ? "merged" : pr.state}`}
                          >
                            {(pr.merged_at ? "merged" : pr.state).toUpperCase()}
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
