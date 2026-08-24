import { useState, useMemo } from "react";
import {
  Circle,
  Activity,
  CheckCircle2,
  Calendar,
  Pencil,
  Trash2,
  Timer,
  CheckSquare,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { DevTask, TaskSubtask } from "../types";
import { TaskQuickSubtasksPopover } from "./TaskQuickSubtasksPopover";
import { TaskCardGitHubBadge } from "../../github/components/TaskCardGitHubBadge";
import type { TaskGitHubLink } from "../../github/types";

export interface TaskCardProps {
  task: DevTask;
  projectName?: string | null;
  projectColor?: string | null;
  onStartSession?: (task: DevTask) => void;
  onEdit: (task: DevTask) => void;
  onDelete: (taskId: string) => Promise<void>;
  isDeleting?: boolean;
  subtasks?: TaskSubtask[];
  onSubtasksChange?: (taskId: string, subtasks: TaskSubtask[]) => void;
  githubLinks?: TaskGitHubLink[];
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
  onStartSession,
  onEdit,
  onDelete,
  isDeleting = false,
  subtasks = [],
  onSubtasksChange,
  githubLinks = [],
}: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const subtaskProgress = useMemo(() => {
    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [subtasks]);

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

        {/* GitHub Development Section (Separate rows for Branch and PR) */}
        {githubLinks && githubLinks.length > 0 && (
          <TaskCardGitHubBadge
            links={githubLinks}
            onOpenEditModal={() => onEdit(task)}
          />
        )}

        <h3 className="devflow-task-card-title">{task.title}</h3>

        {task.description ? (
          <p className="devflow-task-card-desc">{task.description}</p>
        ) : (
          <p className="devflow-task-card-desc italic text-muted-foreground/60">
            No description provided.
          </p>
        )}

        {/* Compact Subtasks Progress Section with Portaled Quick View */}
        <div className="devflow-task-card-subtasks-container">
          <Popover open={quickViewOpen} onOpenChange={setQuickViewOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`devflow-task-subtasks-btn ${quickViewOpen ? "is-active" : ""}`}
                aria-expanded={quickViewOpen}
                aria-haspopup="dialog"
                aria-label={
                  subtaskProgress.total > 0
                    ? `Subtasks: ${subtaskProgress.completed} of ${subtaskProgress.total} completed. Click to view subtasks`
                    : "Subtasks: No subtasks. Click to add subtask"
                }
                title={subtaskProgress.total > 0 ? "View subtasks" : "Add subtask"}
              >
                <div className="devflow-task-subtasks-btn-content">
                  <div className="devflow-task-subtasks-btn-left">
                    <CheckSquare className="size-3.5 text-accent shrink-0" />
                    {subtaskProgress.total > 0 ? (
                      <>
                        <span className="devflow-task-subtasks-label">Subtasks</span>
                        <span className="devflow-task-subtasks-count">
                          {`${subtaskProgress.completed}/${subtaskProgress.total}`}
                        </span>
                      </>
                    ) : (
                      <span className="devflow-task-subtasks-label font-medium">
                        Subtasks <span className="devflow-task-subtasks-dot mx-0.5 text-muted-foreground/70">·</span> <span className="text-accent font-semibold">Add</span>
                      </span>
                    )}
                  </div>
                  <ChevronRight
                    className={`size-3 text-muted-foreground transition-transform duration-200 ${
                      quickViewOpen ? "rotate-90" : ""
                    }`}
                  />
                </div>
                {subtaskProgress.total > 0 && (
                  <div className="devflow-task-subtasks-mini-progress">
                    <div
                      className={`devflow-task-subtasks-mini-progress-fill ${
                        subtaskProgress.percent === 100 ? "is-complete" : ""
                      }`}
                      style={{ width: `${subtaskProgress.percent}%` }}
                    />
                  </div>
                )}
              </button>
            </PopoverTrigger>

            <PopoverContent
              className="w-80 p-3 bg-popover text-popover-foreground border-border shadow-2xl rounded-xl z-50 overflow-hidden"
              align="start"
              sideOffset={6}
            >
              <TaskQuickSubtasksPopover
                taskId={task.id}
                subtasks={subtasks}
                onSubtasksChange={(newSubs) => onSubtasksChange?.(task.id, newSubs)}
                onClose={() => setQuickViewOpen(false)}
                onOpenEditModal={() => {
                  setQuickViewOpen(false);
                  onEdit(task);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

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
                {onStartSession && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onStartSession(task)}
                    aria-label="Start Focus Session for this task"
                    title="Start Focus Session for this task"
                  >
                    <Timer className="size-3.5" />
                  </Button>
                )}
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
