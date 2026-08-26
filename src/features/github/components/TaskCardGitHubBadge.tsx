import { useState } from "react";
import {
  AlertCircle,
  CircleDot,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskGitHubLink } from "../types";
import { GitHubIcon } from "./GitHubIcon";
import "../github.css";

export interface TaskCardGitHubBadgeProps {
  links: TaskGitHubLink[];
  onOpenEditModal?: () => void;
}

export function TaskCardGitHubBadge({
  links,
  onOpenEditModal,
}: TaskCardGitHubBadgeProps) {
  const [open, setOpen] = useState(false);

  if (!links || links.length === 0) {
    return null;
  }

  const issueLink = links.find((l) => l.link_type === "issue");
  const branchLink = links.find((l) => l.link_type === "branch");
  const prLink = links.find((l) => l.link_type === "pull_request");
  const commitLinks = links.filter((l) => l.link_type === "commit");

  const rawPrState = prLink?.metadata?.pr_state || "open";
  const formattedPrState =
    rawPrState === "unavailable"
      ? "Unavailable"
      : rawPrState.charAt(0).toUpperCase() + rawPrState.slice(1);

  const rawIssueState = issueLink?.metadata?.issue_state || "open";
  const formattedIssueState =
    rawIssueState === "unavailable"
      ? "Unavailable"
      : rawIssueState.charAt(0).toUpperCase() + rawIssueState.slice(1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="devflow-task-github-badges-stack flex flex-col items-start gap-2 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Issue Indicator */}
          {issueLink && (
            <div className="w-full flex items-center justify-start">
              <button
                type="button"
                className={`devflow-github-card-badge is-issue is-${rawIssueState}`}
                aria-label={`Issue: #${issueLink.metadata?.issue_number || issueLink.github_id} · ${formattedIssueState}`}
                title={
                  rawIssueState === "unavailable"
                    ? `GitHub Issue: ${issueLink.name} (Unavailable on GitHub) (Click for details)`
                    : `GitHub Issue: ${issueLink.name} (${formattedIssueState}) (Click for details)`
                }
              >
                {rawIssueState === "unavailable" ? (
                  <AlertCircle className="size-4 devflow-issue-icon is-unavailable shrink-0" />
                ) : (
                  <CircleDot className="size-4 devflow-issue-icon shrink-0" />
                )}
                <span className="devflow-github-card-badge-label">
                  #{issueLink.metadata?.issue_number || issueLink.github_id} · {formattedIssueState}
                </span>
              </button>
            </div>
          )}

          {/* Branch Indicator */}
          {branchLink && (
            <div className="w-full flex items-center justify-start">
              <button
                type="button"
                className="devflow-github-card-badge is-branch"
                aria-label={`Branch: ${branchLink.name}`}
                title={`GitHub Branch: ${branchLink.name} (Click for details)`}
              >
                <GitBranch className="size-4 text-accent shrink-0" />
                <span className="devflow-github-card-badge-label truncate max-w-full font-mono">
                  {branchLink.name}
                </span>
              </button>
            </div>
          )}

          {/* Pull Request Indicator */}
          {prLink && (
            <div className="w-full flex items-center justify-start">
              <button
                type="button"
                className={`devflow-github-card-badge is-pr is-${rawPrState}`}
                aria-label={`Pull Request: 1 PR · ${formattedPrState}`}
                title={`GitHub PR: ${prLink.name} (${formattedPrState}) (Click for details)`}
              >
                <GitPullRequest className="size-4 devflow-pr-icon shrink-0" />
                <span className="devflow-github-card-badge-label">
                  1 PR · {formattedPrState}
                </span>
              </button>
            </div>
          )}

          {/* Commit Indicator (only if neither issue, branch, nor PR is attached) */}
          {!issueLink && !branchLink && !prLink && commitLinks.length > 0 && (
            <div className="w-full flex items-center justify-start">
              <button
                type="button"
                className="devflow-github-card-badge is-commit"
                aria-label={`${commitLinks.length} ${commitLinks.length === 1 ? "commit" : "commits"}`}
                title={`${commitLinks.length} GitHub ${commitLinks.length === 1 ? "commit" : "commits"} linked (Click for details)`}
              >
                <GitCommit className="size-4 text-muted-foreground shrink-0" />
                <span className="devflow-github-card-badge-label">
                  {commitLinks.length} {commitLinks.length === 1 ? "commit" : "commits"}
                </span>
              </button>
            </div>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-3 bg-popover text-popover-foreground border-border shadow-2xl rounded-xl z-50 overflow-hidden"
        align="start"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="devflow-github-popover-inner flex flex-col gap-2.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <GitHubIcon className="size-3.5 text-foreground shrink-0" />
              <span className="font-semibold text-xs text-foreground truncate">
                GitHub Development
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setOpen(false)}
              aria-label="Close GitHub popover"
              className="size-5 rounded-md hover:bg-muted"
            >
              <X className="size-3 text-muted-foreground" />
            </Button>
          </div>

          {/* Development Details */}
          <div className="flex flex-col gap-2">
            {/* Issue */}
            {issueLink && (
              <div className="devflow-github-popover-row">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Issue
                </span>
                <div className="flex items-center justify-between gap-1.5 mt-0.5">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span
                      className={`devflow-issue-badge text-[10px] py-0 px-1 is-${rawIssueState}`}
                    >
                      {rawIssueState}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {issueLink.name}
                    </span>
                  </div>
                  <a
                    href={issueLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-accent hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <span>View</span>
                    <ExternalLink className="size-2.5 opacity-80" />
                  </a>
                </div>
              </div>
            )}

            {/* Branch */}
            {branchLink && (
              <div className="devflow-github-popover-row">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Branch
                </span>
                <div className="flex items-center justify-between gap-1.5 mt-0.5">
                  <span className="text-xs font-mono font-medium text-foreground truncate">
                    {branchLink.name}
                  </span>
                  <a
                    href={branchLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-accent hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <span>View</span>
                    <ExternalLink className="size-2.5 opacity-80" />
                  </a>
                </div>
              </div>
            )}

            {/* Pull Request */}
            {prLink && (
              <div className="devflow-github-popover-row">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Pull Request
                </span>
                <div className="flex items-center justify-between gap-1.5 mt-0.5">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span
                      className={`devflow-pr-badge text-[10px] py-0 px-1 ${
                        rawPrState === "merged"
                          ? "is-merged"
                          : rawPrState === "closed"
                          ? "is-closed"
                          : "is-open"
                      }`}
                    >
                      {rawPrState}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {prLink.name}
                    </span>
                  </div>
                  <a
                    href={prLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-accent hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <span>View</span>
                    <ExternalLink className="size-2.5 opacity-80" />
                  </a>
                </div>
              </div>
            )}

            {/* Commits */}
            {commitLinks.length > 0 && (
              <div className="devflow-github-popover-row">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Commits ({commitLinks.length})
                </span>
                <div className="flex flex-col gap-1 mt-1 max-h-24 overflow-y-auto pr-1">
                  {commitLinks.map((commit) => (
                    <div
                      key={commit.id}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <span className="font-mono text-muted-foreground text-[11px] truncate mr-2">
                        {commit.name}
                      </span>
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10.5px] text-accent hover:underline flex items-center gap-0.5 shrink-0"
                      >
                        <ExternalLink className="size-2.5 opacity-80" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          {onOpenEditModal && (
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                className="devflow-quick-subtasks-manage-btn"
                onClick={() => {
                  setOpen(false);
                  onOpenEditModal();
                }}
              >
                <span>Edit GitHub references</span>
                <span className="ml-1 opacity-70">→</span>
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
