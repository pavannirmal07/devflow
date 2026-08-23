import { useState } from "react";
import { CheckCircle2, Archive, Activity, GitBranch, ExternalLink, Pencil, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DevProject } from "../types";

export interface ProjectCardProps {
  project: DevProject;
  onEdit: (project: DevProject) => void;
  onDelete: (projectId: string) => Promise<void>;
  isDeleting?: boolean;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  isDeleting = false,
}: ProjectCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    await onDelete(project.id);
    setConfirmDelete(false);
  };

  const projectColor = project.color || "#a855f7";

  return (
    <div className="devflow-project-card">
      <div
        className="devflow-project-top-strip"
        style={{ backgroundColor: projectColor }}
      />
      <div className="devflow-project-card-body">
        <div className="devflow-project-card-header">
          <div className="devflow-project-title-wrapper">
            <span
              className="devflow-project-color-dot"
              style={{ backgroundColor: projectColor }}
            />
            <h3 className="devflow-project-card-title" title={project.name}>
              {project.name}
            </h3>
          </div>

          {project.status === "active" && (
            <span className="devflow-project-status-badge is-active">
              <Activity className="size-3" />
              <span>Active</span>
            </span>
          )}
          {project.status === "completed" && (
            <span className="devflow-project-status-badge is-completed">
              <CheckCircle2 className="size-3" />
              <span>Completed</span>
            </span>
          )}
          {project.status === "archived" && (
            <span className="devflow-project-status-badge is-archived">
              <Archive className="size-3" />
              <span>Archived</span>
            </span>
          )}
        </div>

        {project.description ? (
          <p className="devflow-project-card-desc">{project.description}</p>
        ) : (
          <p className="devflow-project-card-desc italic text-muted-foreground/60">
            No description provided.
          </p>
        )}

        <div className="devflow-project-card-footer">
          <div className="devflow-project-card-meta">
            {project.github_url ? (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="devflow-project-github-link"
                title={project.github_url}
              >
                <GitBranch className="size-3.5 shrink-0" />
                <span>Repository</span>
                <ExternalLink className="size-3 shrink-0 opacity-70" />
              </a>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" />
                <span>{formatDate(project.updated_at)}</span>
              </div>
            )}
          </div>

          <div className="devflow-project-card-actions">
            {confirmDelete ? (
              <div className="devflow-project-delete-confirm">
                <span className="text-xs text-destructive font-medium">Delete?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "..." : "Yes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  No
                </Button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onEdit(project)}
                  aria-label="Edit project"
                  title="Edit project"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete project"
                  title="Delete project"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
