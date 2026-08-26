import { useState } from "react";
import {
  AlertCircle,
  CircleDot,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DevProject } from "@/features/projects";
import type { CreateTaskInput, DevTask, TaskPriority, TaskStatus } from "../types";
import { getIssues } from "@/features/github/githubApi";
import { linkGitHubItemToTask } from "@/features/github/github";
import type { GitHubIssue, TaskGitHubLink } from "@/features/github/types";
import { GitHubIcon } from "@/features/github/components/GitHubIcon";

export interface CreateTaskModalProps {
  isOpen: boolean;
  projects: DevProject[];
  defaultProjectId?: string | null;
  onClose: () => void;
  onSubmit: (
    input: CreateTaskInput
  ) => Promise<{ task: DevTask | null; error: Error | null }>;
  onLinkCreated?: (taskId: string, links: TaskGitHubLink[]) => void;
}

export function CreateTaskModal({
  isOpen,
  projects,
  defaultProjectId,
  onClose,
  onSubmit,
  onLinkCreated,
}: CreateTaskModalProps) {
  if (!isOpen) return null;

  return (
    <CreateTaskModalForm
      projects={projects}
      defaultProjectId={defaultProjectId}
      onClose={onClose}
      onSubmit={onSubmit}
      onLinkCreated={onLinkCreated}
    />
  );
}

interface CreateTaskModalFormProps {
  projects: DevProject[];
  defaultProjectId?: string | null;
  onClose: () => void;
  onSubmit: (
    input: CreateTaskInput
  ) => Promise<{ task: DevTask | null; error: Error | null }>;
  onLinkCreated?: (taskId: string, links: TaskGitHubLink[]) => void;
}

function CreateTaskModalForm({
  projects,
  defaultProjectId,
  onClose,
  onSubmit,
  onLinkCreated,
}: CreateTaskModalFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>(defaultProjectId || "");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // GitHub Issue Import State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);

  const selectedProject = projects.find((p) => p.id === projectId);
  const hasGitHubRepo = Boolean(
    selectedProject?.github_owner &&
      selectedProject?.github_repo &&
      selectedProject?.github_installation_id
  );

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    const newProj = projects.find((p) => p.id === newProjectId);
    const hasGh = Boolean(
      newProj?.github_owner &&
        newProj?.github_repo &&
        newProj?.github_installation_id
    );
    if (!hasGh) {
      setSelectedIssue(null);
      setIsPickerOpen(false);
    }
  };

  const handleOpenIssuePicker = async () => {
    if (!selectedProject || !hasGitHubRepo) return;
    setIsPickerOpen(true);
    setLoadingIssues(true);
    setIssueError(null);

    const { issues: data, error } = await getIssues(
      selectedProject.github_installation_id!,
      selectedProject.github_owner!,
      selectedProject.github_repo!,
      "open"
    );

    if (error) {
      setIssueError(error.message);
      setIssues([]);
    } else {
      setIssues(data);
      setIssueError(null);
    }
    setLoadingIssues(false);
  };

  const handleSelectIssue = (issue: GitHubIssue) => {
    setSelectedIssue(issue);
    setTitle(issue.title);
    if (issue.body) {
      setDescription(issue.body);
    }
    setIsPickerOpen(false);
  };

  const handleClearSelectedIssue = () => {
    setSelectedIssue(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { task, error } = await onSubmit({
      title: trimmedTitle,
      description: description.trim() || undefined,
      project_id: projectId || undefined,
      status,
      priority,
      due_date: dueDate ? dueDate : undefined,
    });

    if (error) {
      setIsSubmitting(false);
      setErrorMessage(error.message);
      return;
    }

    if (task) {
      // If an issue was imported, link it to the newly created task
      if (selectedIssue && selectedProject) {
        const repoFullName = `${selectedProject.github_owner}/${selectedProject.github_repo}`;
        const { link, error: linkErr } = await linkGitHubItemToTask(task.id, {
          task_id: task.id,
          link_type: "issue",
          github_id: String(selectedIssue.number),
          name: `#${selectedIssue.number} ${selectedIssue.title}`,
          url: selectedIssue.html_url,
          metadata: {
            issue_number: selectedIssue.number,
            issue_state: selectedIssue.state,
            issue_labels: selectedIssue.labels?.map((l) => l.name) || [],
            issue_author: selectedIssue.user?.login || "",
            repo_full_name: repoFullName,
          },
        });

        if (linkErr) {
          setIsSubmitting(false);
          setErrorMessage(
            `Task created, but failed to attach GitHub Issue link: ${linkErr.message}`
          );
          return;
        }

        if (link && onLinkCreated) {
          onLinkCreated(task.id, [link]);
        }
      }

      setIsSubmitting(false);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <div
      className="devflow-task-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      <div className="devflow-task-modal-card">
        <div className="devflow-task-modal-header">
          <h2 id="create-task-title" className="devflow-task-modal-title">
            Create New Task
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X className="size-4" />
          </Button>
        </div>

        {errorMessage && (
          <div className="devflow-task-alert is-error" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="devflow-task-modal-form">
          <div className="devflow-task-modal-fields">
            {/* Project Selector with GitHub Issue Import option */}
            <div className="devflow-field-group">
              <div className="flex items-center justify-between">
                <Label htmlFor="create-task-project" className="devflow-field-label">
                  Project (optional)
                </Label>
                {hasGitHubRepo && !selectedIssue && !isPickerOpen && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleOpenIssuePicker}
                    disabled={isSubmitting}
                    className="h-6 px-2 text-[11px] text-accent hover:text-accent font-medium flex items-center gap-1.5"
                  >
                    <GitHubIcon className="size-3" />
                    <span>Import from GitHub Issue</span>
                  </Button>
                )}
              </div>
              <select
                id="create-task-project"
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={isSubmitting}
                className="devflow-task-select"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.github_repo ? `(${p.github_owner}/${p.github_repo})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Imported GitHub Issue Banner */}
            {selectedIssue && (
              <div className="devflow-github-link-row flex flex-row items-center justify-between gap-2.5 p-2.5 rounded-lg border border-accent/30 bg-accent/5 w-full min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  <CircleDot className="size-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-foreground shrink-0">
                    #{selectedIssue.number}
                  </span>
                  <span className="text-xs text-foreground truncate min-w-0 flex-1">
                    {selectedIssue.title}
                  </span>
                  <a
                    href={selectedIssue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-accent shrink-0 p-0.5"
                    title="View issue on GitHub"
                  >
                    <ExternalLink className="size-3 opacity-70" />
                  </a>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleClearSelectedIssue}
                  disabled={isSubmitting}
                  className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive shrink-0"
                  title="Remove imported issue"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}

            {/* Issue Picker Popover / Drawer */}
            {isPickerOpen && (
              <div className="devflow-github-picker-container p-2.5 rounded-lg border border-border bg-code-bg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <GitHubIcon className="size-3.5" />
                    <span>Select Open Issue to Import</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setIsPickerOpen(false)}
                    className="size-5"
                  >
                    <X className="size-3" />
                  </Button>
                </div>

                {loadingIssues ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin text-accent" />
                    <span>Loading issues from GitHub...</span>
                  </div>
                ) : issueError ? (
                  <p className="text-xs text-destructive py-1">{issueError}</p>
                ) : issues.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No open issues found in this repository
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
                    {issues.map((iss) => (
                      <button
                        key={iss.id}
                        type="button"
                        onClick={() => handleSelectIssue(iss)}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-background text-left text-xs text-foreground transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <CircleDot className="size-3.5 text-emerald-500 shrink-0" />
                          <span className="font-semibold shrink-0">#{iss.number}</span>
                          <span className="truncate">{iss.title}</span>
                        </div>
                        <span className="devflow-issue-badge shrink-0 is-open">
                          OPEN
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Task Title */}
            <div className="devflow-field-group">
              <Label htmlFor="create-task-title-input" className="devflow-field-label">
                Task Title <span className="text-destructive">*</span>
              </Label>
              <input
                id="create-task-title-input"
                type="text"
                placeholder="e.g. Implement authentication callback"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
                className="devflow-task-input"
              />
            </div>

            {/* Task Description */}
            <div className="devflow-field-group">
              <Label htmlFor="create-task-desc" className="devflow-field-label">
                Description (optional)
              </Label>
              <textarea
                id="create-task-desc"
                rows={3}
                placeholder="Details, steps, or acceptance criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="devflow-task-textarea"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="devflow-field-group">
                <Label htmlFor="create-task-due-date" className="devflow-field-label">
                  Due Date (optional)
                </Label>
                <input
                  id="create-task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-task-input"
                />
              </div>

              <div className="devflow-field-group">
                <Label htmlFor="create-task-priority" className="devflow-field-label">
                  Priority
                </Label>
                <select
                  id="create-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={isSubmitting}
                  className="devflow-task-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="devflow-field-group">
              <Label htmlFor="create-task-status" className="devflow-field-label">
                Status
              </Label>
              <select
                id="create-task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={isSubmitting}
                className="devflow-task-select"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="devflow-task-modal-actions">
            <Button
              type="button"
              className="devflow-btn-secondary h-9 px-4"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="devflow-btn-primary h-9 px-4"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
