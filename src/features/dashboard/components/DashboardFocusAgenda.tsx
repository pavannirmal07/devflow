import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Flame,
  ListChecks,
  Play,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DevTask } from "../../tasks/types";
import { formatDueDateSafe, isTaskDueToday, isTaskOverdue } from "../../tasks/utils/dueDate";
import { formatDuration } from "../../tasks/utils/duration";
import type { DashboardAgendaTask } from "../types";

export interface DashboardFocusAgendaProps {
  agendaTasks: DashboardAgendaTask[];
  onStartSession: (task: DevTask) => void;
  onCompleteTask: (taskId: string) => Promise<void>;
  onNavigateToTasks: () => void;
  disabled?: boolean;
}

export function DashboardFocusAgenda({
  agendaTasks,
  onStartSession,
  onCompleteTask,
  onNavigateToTasks,
  disabled = false,
}: DashboardFocusAgendaProps) {
  return (
    <div className="devflow-dashboard-card devflow-dashboard-agenda-card">
      <div className="devflow-dashboard-card-header">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <Flame className="size-4 text-amber-500 shrink-0" />
          <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">
            Today's Focus Agenda
          </h3>
          {agendaTasks.length > 0 && (
            <span className="devflow-dashboard-count-badge shrink-0">
              {agendaTasks.length}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNavigateToTasks}
          className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
        >
          <span>View all tasks</span>
          <ExternalLink className="size-3" />
        </Button>
      </div>

      {agendaTasks.length === 0 ? (
        <div className="devflow-dashboard-agenda-empty">
          <div className="size-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold text-foreground">
              All caught up!
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              No overdue or urgent tasks on your agenda right now.
            </p>
          </div>
        </div>
      ) : (
        <div className="devflow-dashboard-agenda-list" role="list">
          {agendaTasks.map(({ task, category, projectName, projectColor, timeStats, subtaskProgress }) => {
            const isOverdue = isTaskOverdue(task);
            const isDueToday = isTaskDueToday(task);

            return (
              <div
                key={task.id}
                role="listitem"
                className={`devflow-dashboard-agenda-item is-${category}`}
              >
                <div className="flex items-start gap-2.5 w-full">
                  {/* Left: Quick complete check button */}
                  <button
                    type="button"
                    className="devflow-dashboard-agenda-check-btn mt-0.5"
                    onClick={() => void onCompleteTask(task.id)}
                    disabled={disabled}
                    title="Mark as completed"
                    aria-label={`Mark task ${task.title} as completed`}
                  >
                    <Circle className="size-4 text-muted-foreground hover:text-emerald-500 transition-colors" />
                  </button>

                  {/* Main details body */}
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    {/* Row 1: Title and Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[80%]">
                        {task.title}
                      </span>
                      <span className={`devflow-task-priority-badge is-${task.priority} text-[10px] py-0 px-1.5 shrink-0`}>
                        {task.priority}
                      </span>
                    </div>

                    {/* Row 2: Project & Due Date State */}
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      {projectName && (
                        <span className="devflow-task-project-pill text-[10.5px] py-0 px-1.5" title={projectName}>
                          <span
                            className="devflow-task-project-dot size-1.5"
                            style={{ backgroundColor: projectColor || "#a855f7" }}
                          />
                          <span className="truncate max-w-25">{projectName}</span>
                        </span>
                      )}

                      {task.due_date && (
                        <span
                          className={`devflow-task-due-date text-[10.5px] py-0 px-1.5 ${
                            isOverdue ? "is-overdue" : isDueToday ? "is-today" : ""
                          }`}
                        >
                          {isOverdue ? (
                            <>
                              <AlertCircle className="size-3 text-destructive" />
                              <span>Overdue · {formatDueDateSafe(task.due_date)}</span>
                            </>
                          ) : isDueToday ? (
                            <>
                              <Calendar className="size-3 text-amber-500" />
                              <span>Due Today</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="size-3 text-muted-foreground" />
                              <span>Due · {formatDueDateSafe(task.due_date)}</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Subtasks, Tracked Time & Focus Action */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 mt-0.5">
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        {subtaskProgress && (
                          <span className="flex items-center gap-1 font-mono text-[10.5px]">
                            <ListChecks className="size-3 text-muted-foreground shrink-0" />
                            <span>{subtaskProgress.completed}/{subtaskProgress.total} subtasks</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1 font-mono text-[10.5px]">
                          <Clock className="size-3 text-muted-foreground shrink-0" />
                          <span>
                            {timeStats && timeStats.totalSeconds > 0
                              ? `${formatDuration(timeStats.totalSeconds)} tracked`
                              : "0m tracked"}
                          </span>
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => onStartSession(task)}
                        disabled={disabled}
                        className="devflow-btn-secondary gap-1 h-6 px-2 text-xs font-semibold shrink-0"
                        title="Launch a focused development session on this task"
                      >
                        <Play className="size-3 fill-current text-accent" />
                        <span>Focus</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
