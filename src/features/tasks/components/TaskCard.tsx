import { useState, useMemo, useEffect, useRef } from "react";
import {
  Circle,
  Activity,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Pencil,
  Trash2,
  Timer,
  CheckSquare,
  ChevronRight,
  Clock,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { DevTask, TaskStatus, TaskSubtask, TaskTimeStats } from "../types";
import type { DevSession } from "../../sessions/types";
import { TaskQuickSubtasksPopover } from "./TaskQuickSubtasksPopover";
import { TaskCardGitHubBadge } from "../../github/components/TaskCardGitHubBadge";
import type { TaskGitHubLink } from "../../github/types";
import { computeSessionDuration, formatDuration } from "../utils/duration";
import { isTaskOverdue, isTaskDueToday, formatDueDateSafe } from "../utils/dueDate";

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
  timeStats?: TaskTimeStats;
  activeSession?: DevSession | null;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => Promise<void> | void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  isHighlighted?: boolean;
  className?: string;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
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
  timeStats,
  activeSession,
  onStatusChange,
  draggable = false,
  onDragStart,
  onDragEnd,
  isHighlighted = false,
  className = "",
}: TaskCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [moveToOpen, setMoveToOpen] = useState(false);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [isHighlighted]);

  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Mobile Long-Press to open "Move to" menu
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onStatusChange) return;

    // Ignore touches on interactive child controls
    const target = e.target as HTMLElement | null;
    if (
      target?.closest("button") ||
      target?.closest("a") ||
      target?.closest("input") ||
      target?.closest("[role='dialog']") ||
      target?.closest("[data-radix-popper-content-wrapper]")
    ) {
      return;
    }

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setMoveToOpen(true);
      touchStartPosRef.current = null;
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // If user scrolled > 8px before 450ms, cancel long-press
    if (dx > 8 || dy > 8) {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      touchStartPosRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchStartPosRef.current = null;
  };

  const isThisTaskSessionActive =
    activeSession?.task_id === task.id && activeSession.status === "active";
  const isThisTaskSessionPaused =
    activeSession?.task_id === task.id && activeSession.status === "paused";

  // Re-render tick every second when session is active for this task
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isThisTaskSessionActive) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isThisTaskSessionActive]);

  const liveTotalSeconds = useMemo(() => {
    void tick;
    let baseSeconds = 0;

    const sessions = timeStats?.sessions || [];
    const hasLiveActive = activeSession && activeSession.task_id === task.id;

    if (!hasLiveActive) {
      baseSeconds = timeStats?.totalSeconds || 0;
    } else {
      let foundActiveInStats = false;
      for (const s of sessions) {
        if (s.id === activeSession.id) {
          foundActiveInStats = true;
          baseSeconds += computeSessionDuration(activeSession);
        } else {
          baseSeconds += computeSessionDuration(s);
        }
      }
      if (!foundActiveInStats) {
        baseSeconds += computeSessionDuration(activeSession);
      }
    }
    return baseSeconds;
  }, [timeStats, activeSession, task.id, tick]);

  const sessionCount = useMemo(() => {
    let count = timeStats?.sessionCount || 0;
    if (activeSession && activeSession.task_id === task.id) {
      const exists = timeStats?.sessions.some((s) => s.id === activeSession.id);
      if (!exists) count += 1;
    }
    return count;
  }, [timeStats, activeSession, task.id]);

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
    <div
      ref={cardRef}
      className={`devflow-task-card ${isHighlighted ? "is-highlighted" : ""} ${className}`.trim()}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
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

            <span
              className={`devflow-task-priority-badge is-${task.priority.toLowerCase()}`}
            >
              {task.priority.toUpperCase()}
            </span>

            {projectName && (
              <span className="devflow-task-project-pill" title={projectName}>
                <span
                  className="devflow-task-project-dot"
                  style={{ backgroundColor: projectColor || "var(--accent)" }}
                />
                <span className="truncate">{projectName}</span>
              </span>
            )}

            {/* GitHub Badges */}
            {githubLinks && githubLinks.length > 0 && (
              <TaskCardGitHubBadge links={githubLinks} />
            )}
          </div>
        </div>

        <h3 className="devflow-task-card-title">{task.title}</h3>

        {task.description && (
          <p className="devflow-task-card-description">{task.description}</p>
        )}

        {/* Focus Session Tracking Indicators */}
        {(sessionCount > 0 || isThisTaskSessionActive || isThisTaskSessionPaused) && (
          <div className="devflow-task-card-time-row">
            <div className="devflow-task-time-pill" title="Total time tracked on this task">
              <Clock className="size-3 text-muted-foreground shrink-0" />
              <span className="font-mono text-xs font-semibold text-foreground">
                {formatDuration(liveTotalSeconds)}
              </span>
            </div>

            {sessionCount > 0 && (
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
              </span>
            )}

            {isThisTaskSessionActive && (
              <span className="devflow-task-live-session-badge is-active">
                <span className="devflow-pulse-dot shrink-0" />
                <span>Focusing</span>
              </span>
            )}

            {isThisTaskSessionPaused && (
              <span className="devflow-task-live-session-badge is-paused">
                <span>Paused</span>
              </span>
            )}
          </div>
        )}

        {/* Subtasks Collapsible / Quick View Bar */}
        <div className="devflow-task-subtasks-preview">
          <Popover open={quickViewOpen} onOpenChange={setQuickViewOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="devflow-task-subtasks-summary-btn"
                aria-label={`View subtasks for ${task.title}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckSquare className="size-3.5 text-muted-foreground" />
                    {subtaskProgress.total > 0 ? (
                      <span>
                        <strong className="text-foreground">
                          {subtaskProgress.completed}/{subtaskProgress.total}
                        </strong>{" "}
                        subtasks
                      </span>
                    ) : (
                      <span className="italic">No subtasks</span>
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
              (() => {
                const isOverdue = isTaskOverdue(task);
                const isDueToday = isTaskDueToday(task);

                return (
                  <div
                    className={`devflow-task-due-date ${
                      isOverdue ? "is-overdue" : isDueToday ? "is-today" : ""
                    }`}
                    title={
                      isOverdue
                        ? `Overdue: Due on ${formatDueDateSafe(task.due_date)}`
                        : isDueToday
                        ? "Due Today"
                        : `Due: ${formatDueDateSafe(task.due_date)}`
                    }
                  >
                    {isOverdue ? (
                      <>
                        <AlertCircle className="size-3.5 shrink-0 text-destructive" />
                        <span>Overdue ({formatDueDateSafe(task.due_date)})</span>
                      </>
                    ) : isDueToday ? (
                      <>
                        <Calendar className="size-3.5 shrink-0 text-amber-500" />
                        <span>Due Today</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>Due {formatDueDateSafe(task.due_date)}</span>
                      </>
                    )}
                  </div>
                );
              })()
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
                {onStatusChange && (
                  <Popover open={moveToOpen} onOpenChange={setMoveToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Move task status"
                        title="Move to another column"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowRightLeft className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-40 p-1.5 bg-popover text-popover-foreground border-border shadow-lg rounded-lg z-50 space-y-1"
                      align="end"
                      sideOffset={4}
                    >
                      <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                        Move to
                      </div>
                      {task.status !== "todo" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMoveToOpen(false);
                            void onStatusChange(task.id, "todo");
                          }}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent/10 hover:text-accent flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Circle className="size-3 text-sky-500 shrink-0" />
                          <span>To Do</span>
                        </button>
                      )}
                      {task.status !== "in_progress" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMoveToOpen(false);
                            void onStatusChange(task.id, "in_progress");
                          }}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent/10 hover:text-accent flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Activity className="size-3 text-purple-500 shrink-0" />
                          <span>In Progress</span>
                        </button>
                      )}
                      {task.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMoveToOpen(false);
                            void onStatusChange(task.id, "completed");
                          }}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent/10 hover:text-accent flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                          <span>Completed</span>
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
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
