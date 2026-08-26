import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  CircleDot,
  Code2,
  ExternalLink,
  FolderKanban,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Lightbulb,
  ListTodo,
  Pencil,
  Search,
  Trash2,
  Wrench,
  AlertOctagon,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KnowledgeNote } from "../types";
import type { DevProject } from "@/features/projects";
import type { DevTask } from "@/features/tasks";
import type { TaskGitHubLink } from "@/features/github/types";
import { GitHubIcon } from "@/features/github/components/GitHubIcon";

export interface NoteDetailProps {
  note: KnowledgeNote;
  projects?: DevProject[];
  tasks?: DevTask[];
  githubLinksMap?: Record<string, TaskGitHubLink[]>;
  onBack: () => void;
  onEdit: (note: KnowledgeNote) => void;
  onDelete: (noteId: string) => Promise<void>;
  onTogglePin: (noteId: string, isPinned: boolean) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToTask?: (taskId: string, projectId?: string | null) => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoteDetail({
  note,
  projects = [],
  tasks = [],
  githubLinksMap = {},
  onBack,
  onEdit,
  onDelete,
  onTogglePin,
  onNavigateToProject,
  onNavigateToTask,
}: NoteDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const relatedProject = note.project_id
    ? projects.find((p) => p.id === note.project_id)
    : null;

  const relatedTask = note.task_id
    ? tasks.find((t) => t.id === note.task_id)
    : null;

  const taskGitHubLinks = note.task_id ? githubLinksMap[note.task_id] || [] : [];
  const issueLink = taskGitHubLinks.find((l) => l.link_type === "issue");
  const branchLink = taskGitHubLinks.find((l) => l.link_type === "branch");
  const prLink = taskGitHubLinks.find((l) => l.link_type === "pull_request");
  const commitLinks = taskGitHubLinks.filter((l) => l.link_type === "commit");

  const categoryClass = `is-${(note.category || "other").toLowerCase()}`;

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(note.id);
    setIsDeleting(false);
    onBack();
  };

  return (
    <div className="devflow-note-detail">
      {/* Top Action Bar */}
      <div className="devflow-note-detail-topbar">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5"
          aria-label="Back to Knowledge"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Knowledge</span>
        </Button>

        <div className="devflow-note-detail-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onTogglePin(note.id, !note.is_pinned)}
            className="h-8 px-3 text-xs gap-1.5"
            aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
          >
            {note.is_pinned ? (
              <>
                <BookmarkCheck className="size-3.5 text-accent" />
                <span>Pinned</span>
              </>
            ) : (
              <>
                <Bookmark className="size-3.5 opacity-60" />
                <span>Pin to top</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(note)}
            className="h-8 px-3 text-xs gap-1.5"
            aria-label="Edit note"
          >
            <Pencil className="size-3.5" />
            <span>Edit</span>
          </Button>

          {confirmDelete ? (
            <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 px-2 py-1 rounded-md">
              <span className="text-xs text-destructive font-medium">Delete note?</span>
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "..." : "Yes, Delete"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:text-destructive h-8 px-2.5 text-xs gap-1.5"
              aria-label="Delete note"
            >
              <Trash2 className="size-3.5" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Header & Overview Card */}
      <div className="devflow-note-detail-header-card">
        <div className="devflow-note-detail-title-row">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`devflow-category-badge ${categoryClass}`}>
                {note.category || "Bugfix"}
              </span>
              {note.is_pinned && (
                <span className="devflow-pin-badge flex items-center gap-1 text-xs font-semibold">
                  <BookmarkCheck className="size-3.5" />
                  <span>Pinned</span>
                </span>
              )}
            </div>
            <h1 className="devflow-note-detail-title">{note.title}</h1>
          </div>
        </div>

        {/* Summary */}
        {note.summary && (
          <div className="devflow-note-detail-summary-box">
            {note.summary}
          </div>
        )}

        {/* Metadata Banner */}
        <div className="devflow-note-detail-meta-grid">
          {/* Related Project */}
          <div className="devflow-note-detail-meta-item">
            <span className="devflow-note-detail-meta-label">Project</span>
            <div className="devflow-note-detail-meta-val">
              {relatedProject ? (
                <button
                  type="button"
                  className="devflow-note-detail-link"
                  onClick={() => onNavigateToProject?.(relatedProject.id)}
                  title="Open Project Workspace"
                >
                  <FolderKanban
                    className="size-3.5 shrink-0"
                    style={{ color: relatedProject.color || "#a855f7" }}
                  />
                  <span>{relatedProject.name}</span>
                </button>
              ) : note.project_id ? (
                <span className="text-muted-foreground italic">Project linked</span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>

          {/* Related Task */}
          <div className="devflow-note-detail-meta-item">
            <span className="devflow-note-detail-meta-label">Task</span>
            <div className="devflow-note-detail-meta-val">
              {relatedTask ? (
                <button
                  type="button"
                  className="devflow-note-detail-link"
                  onClick={() =>
                    onNavigateToTask?.(relatedTask.id, relatedTask.project_id)
                  }
                  title="Open Task in Tasks view"
                >
                  <ListTodo className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-50">{relatedTask.title}</span>
                </button>
              ) : note.task_id ? (
                <span className="text-muted-foreground italic">Task linked</span>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="devflow-note-detail-meta-item">
            <span className="devflow-note-detail-meta-label">Tags</span>
            <div className="devflow-note-detail-meta-val flex-wrap gap-1">
              {note.tags && note.tags.length > 0 ? (
                note.tags.map((tag, idx) => (
                  <span key={idx} className="devflow-note-tag">
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="devflow-note-detail-meta-item">
            <span className="devflow-note-detail-meta-label">Last Updated</span>
            <div className="devflow-note-detail-meta-val text-xs text-muted-foreground">
              <Calendar className="size-3 shrink-0" />
              <span>{formatDate(note.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Context Strip (only when linked task has GitHub associations) */}
      {taskGitHubLinks.length > 0 && (
        <div className="devflow-note-github-context p-3 rounded-xl border border-border bg-code-bg/60 flex flex-col gap-2 my-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <GitHubIcon className="size-3.5 text-foreground" />
              <span className="text-xs font-semibold text-foreground">
                GitHub Context
              </span>
            </div>
            {relatedProject?.github_owner && relatedProject?.github_repo && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {relatedProject.github_owner}/{relatedProject.github_repo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Issue */}
            {issueLink && (
              <a
                href={issueLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background hover:border-accent/50 text-foreground transition-colors font-medium"
                title={
                  issueLink.metadata?.issue_state === "unavailable"
                    ? `Issue ${issueLink.name} (no longer available on GitHub)`
                    : `Open Issue ${issueLink.name} on GitHub`
                }
              >
                {issueLink.metadata?.issue_state === "unavailable" ? (
                  <AlertCircle className="size-3.5 text-amber-500 shrink-0" />
                ) : (
                  <CircleDot
                    className={`size-3.5 shrink-0 ${issueLink.metadata?.issue_state === "closed" ? "text-purple-400" : "text-emerald-500"}`}
                  />
                )}
                <span>{issueLink.name}</span>
                {issueLink.metadata?.issue_state === "unavailable" && (
                  <span className="devflow-issue-badge text-[9px] py-0 px-1 is-unavailable">
                    UNAVAILABLE
                  </span>
                )}
                <ExternalLink className="size-2.5 opacity-60 ml-0.5" />
              </a>
            )}

            {/* Branch */}
            {branchLink && (
              <a
                href={branchLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background hover:border-accent/50 text-foreground transition-colors font-mono"
                title={`Open branch ${branchLink.name} on GitHub`}
              >
                <GitBranch className="size-3.5 text-accent" />
                <span>{branchLink.name}</span>
                <ExternalLink className="size-2.5 opacity-60 ml-0.5" />
              </a>
            )}

            {/* Pull Request */}
            {prLink && (
              <a
                href={prLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background hover:border-accent/50 text-foreground transition-colors font-medium"
                title={`Open PR ${prLink.name} on GitHub`}
              >
                <GitPullRequest
                  className={`size-3.5 ${prLink.metadata?.pr_state === "merged" ? "text-purple-400" : prLink.metadata?.pr_state === "closed" ? "text-muted-foreground" : "text-emerald-500"}`}
                />
                <span>{prLink.name}</span>
                {prLink.metadata?.pr_state && (
                  <span
                    className={`devflow-pr-badge text-[9px] py-0 px-1 is-${prLink.metadata.pr_state}`}
                  >
                    {String(prLink.metadata.pr_state).toUpperCase()}
                  </span>
                )}
                <ExternalLink className="size-2.5 opacity-60 ml-0.5" />
              </a>
            )}

            {/* Commits */}
            {commitLinks.map((commit) => (
              <a
                key={commit.id}
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background hover:border-accent/50 text-foreground transition-colors font-mono text-[11px]"
                title={`Open commit ${commit.name} on GitHub`}
              >
                <GitCommit className="size-3 text-muted-foreground" />
                <span>{commit.name}</span>
                <ExternalLink className="size-2.5 opacity-60 ml-0.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
         STRUCTURED ENGINEERING JOURNAL SECTIONS
         ========================================================================= */}

      {/* 1. Problem */}
      {note.problem && (
        <section className="devflow-journal-section is-problem">
          <div className="devflow-journal-section-header">
            <h2 className="devflow-journal-section-title">
              <AlertOctagon className="size-4 text-destructive shrink-0" />
              <span>Problem</span>
            </h2>
            <span className="devflow-journal-section-subtitle">What happened?</span>
          </div>
          <div className="devflow-journal-section-body">{note.problem}</div>
        </section>
      )}

      {/* 2. Investigation */}
      {note.investigation && (
        <section className="devflow-journal-section is-investigation">
          <div className="devflow-journal-section-header">
            <h2 className="devflow-journal-section-title">
              <Search className="size-4 text-amber-500 shrink-0" />
              <span>Investigation</span>
            </h2>
            <span className="devflow-journal-section-subtitle">
              What was checked / tested?
            </span>
          </div>
          <div className="devflow-journal-section-body">{note.investigation}</div>
        </section>
      )}

      {/* 3. Root Cause */}
      {note.root_cause && (
        <section className="devflow-journal-section is-root-cause">
          <div className="devflow-journal-section-header">
            <h2 className="devflow-journal-section-title">
              <Target className="size-4 text-purple-400 shrink-0" />
              <span>Root Cause</span>
            </h2>
            <span className="devflow-journal-section-subtitle">Why did it happen?</span>
          </div>
          <div className="devflow-journal-section-body">{note.root_cause}</div>
        </section>
      )}

      {/* 4. Solution */}
      {note.solution && (
        <section className="devflow-journal-section is-solution">
          <div className="devflow-journal-section-header">
            <h2 className="devflow-journal-section-title">
              <Wrench className="size-4 text-emerald-500 shrink-0" />
              <span>Solution</span>
            </h2>
            <span className="devflow-journal-section-subtitle">What was changed?</span>
          </div>
          <div className="devflow-journal-section-body">{note.solution}</div>
        </section>
      )}

      {/* 5. Lessons Learned */}
      {note.lessons_learned && (
        <section className="devflow-journal-section is-lessons-learned">
          <div className="devflow-journal-section-header">
            <h2 className="devflow-journal-section-title">
              <Lightbulb className="size-4 text-sky-400 shrink-0" />
              <span>Lessons Learned</span>
            </h2>
            <span className="devflow-journal-section-subtitle">
              What to remember for the future
            </span>
          </div>
          <div className="devflow-journal-section-body">{note.lessons_learned}</div>
        </section>
      )}

      {/* 6. Additional Notes & Code Snippets */}
      {note.content && (
        <section className="devflow-journal-section is-content">
          <div className="devflow-journal-section-header">
            <h2 className="devflow-journal-section-title">
              <Code2 className="size-4 text-cyan-400 shrink-0" />
              <span>Additional Notes & Code</span>
            </h2>
            <span className="devflow-journal-section-subtitle">
              Technical details & snippets
            </span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <pre className="devflow-journal-code-block">{note.content}</pre>
          </div>
        </section>
      )}

      {/* Fallback if all structured fields are empty */}
      {!note.problem &&
        !note.investigation &&
        !note.root_cause &&
        !note.solution &&
        !note.lessons_learned &&
        !note.content && (
          <div className="devflow-knowledge-empty py-12">
            <p className="text-muted-foreground text-sm">
              No detailed journal sections recorded for this note yet.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(note)}
              className="mt-2"
            >
              <Pencil className="size-3.5 mr-1.5" />
              <span>Edit note & add details</span>
            </Button>
          </div>
        )}
    </div>
  );
}
