import { useEffect, useMemo, useState } from "react";
import { Clock, Play, Timer, CheckCircle2, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { DevTask, TaskTimeStats } from "../types";
import type { DevSession } from "../../sessions/types";
import { computeSessionDuration, formatDuration } from "../utils/duration";

export interface TaskTimeSectionProps {
  task: DevTask;
  timeStats?: TaskTimeStats;
  onStartSession?: (task: DevTask) => void;
  activeSession?: DevSession | null;
  disabled?: boolean;
}

function formatSessionDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskTimeSection({
  task,
  timeStats,
  onStartSession,
  activeSession,
  disabled = false,
}: TaskTimeSectionProps) {
  const isThisTaskSessionActive =
    activeSession?.task_id === task.id && activeSession.status === "active";
  const isThisTaskSessionPaused =
    activeSession?.task_id === task.id && activeSession.status === "paused";

  // Re-render every second when this task has an active running session for 100% live precision
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isThisTaskSessionActive) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isThisTaskSessionActive]);

  // Combine stored session summaries with any live active/paused session
  const combinedSessions = useMemo(() => {
    const list = [...(timeStats?.sessions || [])];

    if (activeSession && activeSession.task_id === task.id) {
      const existingIdx = list.findIndex((s) => s.id === activeSession.id);
      const activeSummary = {
        id: activeSession.id,
        title: activeSession.title,
        duration_seconds: activeSession.duration_seconds,
        accumulated_seconds: activeSession.accumulated_seconds,
        status: activeSession.status,
        started_at: activeSession.started_at,
        ended_at: activeSession.ended_at,
        last_resumed_at: activeSession.last_resumed_at,
      };

      if (existingIdx >= 0) {
        list[existingIdx] = activeSummary;
      } else {
        list.unshift(activeSummary);
      }
    }

    return list;
  }, [timeStats, activeSession, task.id]);

  const liveTotalSeconds = combinedSessions.reduce(
    (acc, sess) => acc + computeSessionDuration(sess),
    0
  );

  const totalSessionCount = combinedSessions.length;

  const canStartSession = !activeSession && task.status !== "completed";

  return (
    <div className="devflow-task-time-section">
      {/* Section Header */}
      <div className="devflow-task-time-section-header">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="size-4 text-accent shrink-0" />
          <span className="devflow-field-label m-0 text-sm font-semibold">
            Time Tracked
          </span>
          {isThisTaskSessionActive && (
            <span className="devflow-task-time-live-pill">
              <span className="devflow-pulse-dot" />
              <span>Active</span>
            </span>
          )}
          {isThisTaskSessionPaused && (
            <span className="devflow-task-time-paused-pill">
              <Pause className="size-2.5" />
              <span>Paused</span>
            </span>
          )}
        </div>

        {liveTotalSeconds > 0 && (
          <span className="devflow-task-time-total-pill font-mono">
            {formatDuration(liveTotalSeconds)}
          </span>
        )}
      </div>

      {/* Stats Cards Row */}
      <div className="devflow-task-time-stats-grid">
        <div className="devflow-task-time-stat-card">
          <span className="devflow-task-time-stat-label">Total Time</span>
          <span className="devflow-task-time-stat-value font-mono">
            {formatDuration(liveTotalSeconds)}
          </span>
        </div>

        <div className="devflow-task-time-stat-card">
          <span className="devflow-task-time-stat-label">Focus Sessions</span>
          <span className="devflow-task-time-stat-value font-mono">
            {totalSessionCount}
          </span>
        </div>

        {onStartSession && (
          <div className="devflow-task-time-action-card">
            {canStartSession ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onStartSession(task)}
                disabled={disabled}
                className="devflow-btn-secondary h-full w-full text-xs font-semibold gap-1.5 py-2.5"
                title="Launch a focused development session for this task"
              >
                <Play className="size-3.5 fill-current text-accent" />
                <span>Start Session</span>
              </Button>
            ) : isThisTaskSessionActive || isThisTaskSessionPaused ? (
              <div className="flex items-center justify-center h-full w-full px-2 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-xs text-accent font-medium text-center">
                <span>Session in progress</span>
              </div>
            ) : activeSession ? (
              <div className="flex items-center justify-center h-full w-full px-2 py-1.5 rounded-lg border border-border bg-code-bg text-[11px] text-muted-foreground text-center">
                <span>Another session is running</span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full w-full px-2 py-1.5 rounded-lg border border-border bg-code-bg text-[11px] text-muted-foreground text-center">
                <span>Task completed</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session History Feed */}
      {combinedSessions.length === 0 ? (
        <div className="devflow-task-time-empty">
          <Timer className="size-4 text-muted-foreground opacity-60 shrink-0" />
          <p className="text-xs text-muted-foreground">
            No focus sessions logged for this task yet.
          </p>
        </div>
      ) : (
        <div className="devflow-task-time-history-container">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Session History ({combinedSessions.length})
          </span>
          <div className="devflow-task-time-history-list" role="list">
            {combinedSessions.map((session) => {
              const sessionSecs = computeSessionDuration(session);
              const isSessionActive = session.status === "active";
              const isSessionPaused = session.status === "paused";

              return (
                <div
                  key={session.id}
                  role="listitem"
                  className={`devflow-task-time-session-row ${
                    isSessionActive ? "is-active" : isSessionPaused ? "is-paused" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {session.status === "completed" ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    ) : isSessionActive ? (
                      <span className="devflow-pulse-dot shrink-0" />
                    ) : (
                      <Pause className="size-3.5 text-amber-500 shrink-0" />
                    )}

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-foreground truncate">
                        {session.title || task.title}
                      </span>
                      <span className="text-[10.5px] text-muted-foreground">
                        {formatSessionDate(session.started_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`devflow-task-time-session-status-badge is-${session.status}`}
                    >
                      {session.status}
                    </span>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {formatDuration(sessionSecs)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
