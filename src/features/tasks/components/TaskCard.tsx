import { useState } from "react";
import { Circle, Activity, CheckCircle2, Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DevTask } from "../types";

export interface TaskCardProps {
  task: DevTask;
  projectName?: string | null;
  projectColor?: string | null;
  onEdit: (task: DevTask) => void;
  onDelete: (taskId: string) => Promise<void>;
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

function formatDueDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function TaskCard({
  task,
  projectName,
  projectColor,
  onEdit,
  onDelete,
  isDeleting = false,
}: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    await onDelete(task.id);
    setConfirmDelete(false);
  };

  return (
    <div className="devflow-task-card">
      <div className="devflow-task-card-body">
        <div className="devflow-task-card-header">
          <div className="devflow-task-badges-row">
            {task.status === "todo" && (
              <span className="devflow-task-status-badge is-todo">
                <Circle className="size-3" />
                <span>To Do</span>
              </span>
            )}
            {task.status === "in_progress" && (
              <span className="devflow-task-status-badge is-in_progress">
                <Activity className="size-3" />
                <span>In Progress</span>
              </span>
            )}
            {task.status === "completed" && (
              <span className="devflow-task-status-badge is-completed">
                <CheckCircle2 className="size-3" />
                <span>Completed</span>
              </span>
            )}

            <span className={`devflow-task-priority-badge is-${task.priority}`}>
              <span>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
            </span>

            {projectName && (
              <span className="devflow-task-project-pill" title={projectName}>
                <span
                  className="devflow-task-project-dot"
                  style={{ backgroundColor: projectColor || "#a855f7" }}
                />
                <span className="truncate">{projectName}</span>
              </span>
            )}
          </div>
        </div>

        <h3 className="devflow-task-card-title">{task.title}</h3>

        {task.description ? (
          <p className="devflow-task-card-desc">{task.description}</p>
        ) : (
          <p className="devflow-task-card-desc italic text-muted-foreground/60">
            No description provided.
          </p>
        )}

        <div className="devflow-task-card-footer">
          <div className="devflow-task-card-meta">
            {task.due_date ? (
              <div className="devflow-task-due-date" title={`Due: ${task.due_date}`}>
                <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                <span>Due {formatDueDate(task.due_date)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Updated {formatDate(task.updated_at)}</span>
              </div>
            )}
          </div>

          <div className="devflow-task-card-actions">
            {confirmDelete ? (
              <div className="devflow-task-delete-confirm">
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
                  onClick={() => onEdit(task)}
                  aria-label="Edit task"
                  title="Edit task"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete task"
                  title="Delete task"
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
