import { useEffect, useState } from "react";
import {
  Timer,
  Play,
  Pause,
  CheckCircle2,
  GitBranch,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DevSession } from "../../sessions/types";
import type { DevTask } from "../../tasks/types";
import type { TaskGitHubLink } from "../../github/types";
import { computeSessionDuration } from "../../tasks/utils/duration";

export interface DashboardActiveSessionCardProps {
  activeSession: DevSession | null;
  linkedTask?: DevTask | null;
  linkedGitHubLinks?: TaskGitHubLink[];
  projectName?: string | null;
  projectColor?: string | null;
  onPause: (sessionId: string) => Promise<void>;
  onResume: (sessionId: string) => Promise<void>;
  onComplete: (sessionId: string) => Promise<void>;
  onStartNewSession: () => void;
  isActionLoading?: boolean;
}

function formatStopwatch(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function DashboardActiveSessionCard({
  activeSession,
  linkedTask,
  linkedGitHubLinks = [],
  projectName,
  projectColor,
  onPause,
  onResume,
  onComplete,
  onStartNewSession,
  isActionLoading = false,
}: DashboardActiveSessionCardProps) {
  const isRunning = activeSession?.status === "active";

  // Re-render tick every second when session is active for precision stopwatch
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const currentDurationSeconds = activeSession
    ? computeSessionDuration(activeSession)
    : 0;

  const branchLink = linkedGitHubLinks.find((l) => l.link_type === "branch");
  const prLink = linkedGitHubLinks.find((l) => l.link_type === "pull_request");

  if (!activeSession) {
    return (
      <div className="devflow-dashboard-card devflow-dashboard-idle-session">
        <div className="devflow-dashboard-idle-content">
          <div className="devflow-dashboard-idle-icon-wrap">
            <Timer className="size-6 text-accent" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-foreground">
              Ready to code?
            </h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Launch a distraction-free focus session to track real development time and link your progress to tasks.
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="devflow-btn-primary gap-2 h-9 px-4 shrink-0"
          onClick={onStartNewSession}
        >
          <Play className="size-3.5 fill-current" />
          <span>Start Focus Session</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`devflow-dashboard-card devflow-dashboard-active-session ${
        isRunning ? "is-live" : "is-paused"
      }`}
    >
      <div className="devflow-dashboard-session-main">
        {/* Header & Status Pill */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <span className="devflow-dashboard-live-pill">
                <span className="devflow-pulse-dot" />
                <span>Live Focus Session</span>
              </span>
            ) : (
              <span className="devflow-dashboard-paused-pill">
                <Pause className="size-3" />
                <span>Session Paused</span>
              </span>
            )}

            {projectName && (
              <span className="devflow-task-project-pill" title={projectName}>
                <span
                  className="devflow-task-project-dot"
                  style={{ backgroundColor: projectColor || "#a855f7" }}
                />
                <span className="truncate max-w-35">{projectName}</span>
              </span>
            )}
          </div>

          <div className="devflow-dashboard-stopwatch font-mono">
            {formatStopwatch(currentDurationSeconds)}
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-1 my-1">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {activeSession.title}
          </h2>
          {activeSession.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {activeSession.description}
            </p>
          )}
        </div>

        {/* Linked Task & GitHub Meta Bar */}
        {(linkedTask || branchLink || prLink) && (
          <div className="devflow-dashboard-session-meta-row">
            {linkedTask && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80 bg-background/60 px-2.5 py-1 rounded-md border border-border/60">
                <ListTodo className="size-3.5 text-accent shrink-0" />
                <span className="font-medium truncate max-w-50">
                  {linkedTask.title}
                </span>
                <span className={`devflow-task-priority-badge is-${linkedTask.priority} text-[10px] py-0 px-1.5`}>
                  {linkedTask.priority}
                </span>
              </div>
            )}

            {branchLink && (
              <a
                href={branchLink.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-foreground/80 bg-background/60 hover:text-accent px-2.5 py-1 rounded-md border border-border/60 transition-colors"
                title={`Branch: ${branchLink.name}`}
              >
                <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-[11px] truncate max-w-35">
                  {branchLink.name}
                </span>
              </a>
            )}

            {prLink && (
              <a
                href={prLink.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-foreground/80 bg-background/60 hover:text-accent px-2.5 py-1 rounded-md border border-border/60 transition-colors"
                title={`PR: ${prLink.name}`}
              >
                <span className="devflow-github-state-badge is-open text-[10px]">
                  PR
                </span>
                <span className="text-[11px] truncate max-w-30">
                  {prLink.name}
                </span>
              </a>
            )}
          </div>
        )}
      </div>


      {/* Control Actions */}
      <div className="devflow-dashboard-session-actions">
        {isRunning ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPause(activeSession.id)}
            disabled={isActionLoading}
            className="devflow-btn-secondary gap-1.5 h-9 px-3 text-xs"
          >
            <Pause className="size-3.5" />
            <span>Pause</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onResume(activeSession.id)}
            disabled={isActionLoading}
            className="devflow-btn-secondary gap-1.5 h-9 px-3 text-xs text-amber-500"
          >
            <Play className="size-3.5 fill-current" />
            <span>Resume</span>
          </Button>
        )}

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => onComplete(activeSession.id)}
          disabled={isActionLoading}
          className="devflow-btn-primary gap-1.5 h-9 px-4 text-xs font-semibold"
        >
          <CheckCircle2 className="size-3.5" />
          <span>Complete Session</span>
        </Button>
      </div>
    </div>
  );
}
