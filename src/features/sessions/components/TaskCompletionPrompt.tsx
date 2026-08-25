import { CheckCircle2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import "../sessions.css";

export interface TaskCompletionPromptState {
  taskId: string;
  taskTitle: string;
  durationSeconds: number;
}

export interface TaskCompletionPromptProps {
  promptState: TaskCompletionPromptState;
  onKeepInProgress: () => void;
  onMarkTaskDone: () => void | Promise<void>;
  isUpdatingTask?: boolean;
}

function formatPromptDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remSec = seconds % 60;
    return remSec > 0 ? `${minutes}m ${remSec}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

export function TaskCompletionPrompt({
  promptState,
  onKeepInProgress,
  onMarkTaskDone,
  isUpdatingTask = false,
}: TaskCompletionPromptProps) {
  return (
    <div className="devflow-session-completion-prompt" role="status">
      <div className="devflow-completion-prompt-content">
        <div className="devflow-completion-prompt-header">
          <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="devflow-completion-prompt-title">Session Completed</h3>
            <p className="devflow-completion-prompt-desc">
              You worked on{" "}
              <span className="font-semibold">"{promptState.taskTitle}"</span> for{" "}
              <span className="font-semibold">
                {formatPromptDuration(promptState.durationSeconds)}
              </span>.
            </p>
            <p className="devflow-completion-prompt-question">
              Would you like to mark this task as completed?
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onKeepInProgress}
            aria-label="Dismiss completion prompt"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="devflow-completion-prompt-actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="devflow-completion-btn-secondary h-8 px-3 text-xs"
          onClick={onKeepInProgress}
          disabled={isUpdatingTask}
        >
          Keep In Progress
        </Button>
        <Button
          type="button"
          size="sm"
          className="devflow-btn-primary h-8 px-3 text-xs gap-1.5"
          onClick={onMarkTaskDone}
          disabled={isUpdatingTask}
        >
          <Check className="size-3.5" />
          <span>{isUpdatingTask ? "Updating..." : "Mark Task as Done"}</span>
        </Button>
      </div>
    </div>
  );
}
