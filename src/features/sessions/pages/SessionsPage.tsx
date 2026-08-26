import { useState, useMemo } from "react";
import { Plus, Timer, AlertCircle, RefreshCw, X, Check, Pause, Play, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/features/tasks";
import { useSessions } from "../useSessions";
import { SessionTimer } from "../components/SessionTimer";
import { SessionCard } from "../components/SessionCard";
import {
  TaskCompletionPrompt,
  type TaskCompletionPromptState,
} from "../components/TaskCompletionPrompt";
import "../sessions.css";

export interface SessionsPageProps {
  userId: string;
}

function formatStartTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionsPage({ userId }: SessionsPageProps) {
  const {
    sessions,
    activeSession,
    loading,
    error,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    deleteSession,
    refreshSessions,
  } = useSessions(userId);

  const { tasks, updateTask, refreshTasks } = useTasks(userId);
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const selectableTasks = useMemo(
    () => tasks.filter((t) => t.status !== "completed"),
    [tasks]
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [taskCompletionPrompt, setTaskCompletionPrompt] = useState<TaskCompletionPromptState | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const activeLinkedTask = activeSession?.task_id
    ? taskMap.get(activeSession.task_id)
    : null;

  const handleOpenCreateForm = () => {
    if (activeSession) {
      setActiveWarning(
        "A session is already in progress. Please complete your current session before starting a new one."
      );
      return;
    }
    setActiveWarning(null);
    setActionError(null);
    setSelectedTaskId("");
    setIsFormOpen(true);
  };

  const handleCloseCreateForm = () => {
    setIsFormOpen(false);
    setFormTitle("");
    setFormDesc("");
    setSelectedTaskId("");
    setActionError(null);
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (taskId) {
      const task = taskMap.get(taskId);
      if (task && !formTitle.trim()) {
        setFormTitle(task.title);
      }
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle || isStarting) return;

    setIsStarting(true);
    setActionError(null);

    const { session, error: startErr } = await startSession({
      title: trimmedTitle,
      description: formDesc.trim() || undefined,
      task_id: selectedTaskId || undefined,
    });

    setIsStarting(false);

    if (startErr) {
      setActionError(startErr.message);
    } else if (session) {
      if (selectedTaskId) {
        await refreshTasks();
      }
      handleCloseCreateForm();
    }
  };

  const handlePauseActive = async () => {
    if (!activeSession || isPausing || isCompleting) return;

    setIsPausing(true);
    setActionError(null);
    setActiveWarning(null);

    const { error: pauseErr } = await pauseSession(activeSession.id);
    setIsPausing(false);

    if (pauseErr) {
      setActionError(pauseErr.message);
    }
  };

  const handleResumeActive = async () => {
    if (!activeSession || isResuming || isCompleting) return;

    setIsResuming(true);
    setActionError(null);
    setActiveWarning(null);

    const { error: resumeErr } = await resumeSession(activeSession.id);
    setIsResuming(false);

    if (resumeErr) {
      setActionError(resumeErr.message);
    }
  };

  const handleCompleteActive = async () => {
    if (!activeSession || isCompleting || isPausing || isResuming) return;

    const completingSession = activeSession;
    setIsCompleting(true);
    setActionError(null);
    setActiveWarning(null);

    const { session: completed, error: endErr } = await endSession(completingSession.id);
    setIsCompleting(false);

    if (endErr) {
      setActionError(endErr.message);
    } else if (completed && completed.task_id) {
      const linkedTask = taskMap.get(completed.task_id);
      if (linkedTask && linkedTask.status !== "completed") {
        setTaskCompletionPrompt({
          taskId: linkedTask.id,
          taskTitle: linkedTask.title,
          durationSeconds: completed.duration_seconds || 0,
        });
      }
    }
  };

  const handleKeepInProgress = () => {
    setTaskCompletionPrompt(null);
  };

  const handleMarkTaskDone = async () => {
    if (!taskCompletionPrompt || isUpdatingTask) return;

    setIsUpdatingTask(true);
    setActionError(null);

    const { error: updateErr } = await updateTask(taskCompletionPrompt.taskId, {
      status: "completed",
    });

    setIsUpdatingTask(false);

    if (updateErr) {
      setActionError(updateErr.message);
    } else {
      setTaskCompletionPrompt(null);
      await refreshTasks();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingId(sessionId);
    setActionError(null);
    const { error: delErr } = await deleteSession(sessionId);
    setDeletingId(null);

    if (delErr) {
      setActionError(delErr.message);
    }
  };

  return (
    <div className="devflow-sessions-page">
      {/* Top Header */}
      <div className="devflow-sessions-header">
        <p className="devflow-sessions-subtitle">
          Track your focused development time and work sessions.
        </p>

        {!isFormOpen && (
          <Button
            type="button"
            className="devflow-btn-primary gap-2 h-9 px-4"
            onClick={handleOpenCreateForm}
          >
            <Plus className="size-4" />
            <span>Start New Session</span>
          </Button>
        )}
      </div>

      {/* Global Query Error Banner */}
      {error && (
        <div className="devflow-session-alert is-error" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void refreshSessions()}
          >
            <RefreshCw className="size-3 mr-1" />
            <span>Try Again</span>
          </Button>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="devflow-session-alert is-error" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Active Session Exists Warning Banner */}
      {activeWarning && (
        <div className="devflow-session-alert is-warning" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{activeWarning}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setActiveWarning(null)}
            aria-label="Dismiss warning"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Task Completion Prompt Card */}
      {taskCompletionPrompt && (
        <TaskCompletionPrompt
          promptState={taskCompletionPrompt}
          onKeepInProgress={handleKeepInProgress}
          onMarkTaskDone={handleMarkTaskDone}
          isUpdatingTask={isUpdatingTask}
        />
      )}

      {/* Start New Session Form Card */}
      {isFormOpen && (
        <form
          className="devflow-session-form-card"
          onSubmit={handleStartSession}
        >
          <div className="devflow-session-form-header">
            <h2 className="devflow-session-form-title">Start New Session</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleCloseCreateForm}
              aria-label="Close form"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="devflow-session-form-fields">
            <div className="devflow-field-group">
              <Label htmlFor="session-task" className="devflow-field-label">
                Linked Task (optional)
              </Label>
              <select
                id="session-task"
                value={selectedTaskId}
                onChange={(e) => handleTaskSelect(e.target.value)}
                disabled={isStarting}
                className="devflow-session-select"
                aria-label="Link session to a task"
              >
                <option value="">No linked task (standalone session)</option>
                {selectableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.status === "in_progress" ? "In Progress" : "To Do"})
                  </option>
                ))}
              </select>
            </div>

            <div className="devflow-field-group">
              <Label htmlFor="session-title" className="devflow-field-label">
                Session Title <span className="text-destructive">*</span>
              </Label>
              <input
                id="session-title"
                type="text"
                placeholder="e.g. Implement user authentication flow"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                disabled={isStarting}
                required
                autoFocus
                className="devflow-session-input"
              />
            </div>

            <div className="devflow-field-group">
              <Label htmlFor="session-desc" className="devflow-field-label">
                Description (optional)
              </Label>
              <textarea
                id="session-desc"
                rows={3}
                placeholder="e.g. Refactoring RLS policies and fixing edge-case redirects"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                disabled={isStarting}
                className="devflow-session-textarea"
              />
            </div>
          </div>

          <div className="devflow-session-form-actions">
            <Button
              type="button"
              className="devflow-btn-secondary h-9 px-4"
              onClick={handleCloseCreateForm}
              disabled={isStarting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="devflow-btn-primary h-9 px-4"
              disabled={!formTitle.trim() || isStarting}
            >
              {isStarting ? "Starting..." : "Start Session"}
            </Button>
          </div>
        </form>
      )}

      {/* Initial Loading Skeleton */}
      {loading && sessions.length === 0 && (
        <div className="flex flex-col gap-4">
          <div className="devflow-session-skeleton">
            <div className="devflow-skeleton-bar is-title" />
            <div className="devflow-skeleton-bar is-sub" />
            <div className="devflow-skeleton-bar is-short" />
          </div>
          <div className="devflow-session-skeleton">
            <div className="devflow-skeleton-bar is-title" />
            <div className="devflow-skeleton-bar is-sub" />
          </div>
        </div>
      )}

      {/* Prominent Active / Paused Session Card */}
      {activeSession && (
        <div
          className={`devflow-active-session-card ${
            activeSession.status === "paused" ? "is-paused" : ""
          }`}
        >
          <div className="devflow-active-session-top">
            <div>
              <div className="devflow-active-badges-row">
                {activeSession.status === "paused" ? (
                  <div className="devflow-active-badge is-paused">
                    <Pause className="size-3.5" />
                    <span>Session Paused</span>
                  </div>
                ) : (
                  <div className="devflow-active-badge">
                    <span className="devflow-pulse-dot" />
                    <span>Active Session</span>
                  </div>
                )}

                {activeLinkedTask && (
                  <div
                    className="devflow-session-linked-task-badge"
                    title={`Linked Task: ${activeLinkedTask.title}`}
                  >
                    <ListTodo className="size-3.5 shrink-0" />
                    <span className="truncate">Task: {activeLinkedTask.title}</span>
                  </div>
                )}
              </div>

              <h2 className="devflow-active-title">{activeSession.title}</h2>
              {activeSession.description && (
                <p className="devflow-active-desc">
                  {activeSession.description}
                </p>
              )}
            </div>
          </div>

          <div className="devflow-active-timer-row">
            <div className="devflow-timer-display">
              <SessionTimer
                key={`${activeSession.id}-${activeSession.status}`}
                status={activeSession.status}
                accumulatedSeconds={activeSession.accumulated_seconds}
                lastResumedAt={activeSession.last_resumed_at}
                startedAt={activeSession.started_at}
                className="devflow-timer-digits"
              />
              <span className="devflow-timer-started-at">
                Started at {formatStartTime(activeSession.started_at)}
              </span>
            </div>

            <div className="devflow-active-actions">
              {activeSession.status === "active" ? (
                <Button
                  type="button"
                  className="devflow-pause-btn gap-1.5"
                  onClick={handlePauseActive}
                  disabled={isPausing || isCompleting}
                >
                  <Pause className="size-4" />
                  <span>{isPausing ? "Pausing..." : "Pause"}</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="devflow-resume-btn gap-1.5"
                  onClick={handleResumeActive}
                  disabled={isResuming || isCompleting}
                >
                  <Play className="size-4 fill-current" />
                  <span>{isResuming ? "Resuming..." : "Resume"}</span>
                </Button>
              )}

              <Button
                type="button"
                className="devflow-complete-btn gap-2"
                onClick={handleCompleteActive}
                disabled={isCompleting || isPausing || isResuming}
              >
                <Check className="size-4" />
                <span>
                  {isCompleting ? "Completing..." : "Complete Session"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session History Section */}
      {completedSessions.length > 0 && (
        <section className="devflow-session-history-section">
          <div className="devflow-history-header">
            <h2 className="devflow-history-title">
              <span>Session History</span>
              <span className="devflow-count-badge">
                {completedSessions.length}
              </span>
            </h2>
          </div>

          <div className="devflow-history-list">
            {completedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                taskTitle={session.task_id ? taskMap.get(session.task_id)?.title || null : null}
                onDelete={handleDeleteSession}
                isDeleting={deletingId === session.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && sessions.length === 0 && !isFormOpen && (
        <div className="devflow-sessions-empty">
          <Timer className="devflow-empty-icon" />
          <h3 className="devflow-empty-title">No sessions yet</h3>
          <p className="devflow-empty-desc">
            Start a focused session to log your development progress and time.
          </p>
          <Button
            type="button"
            className="devflow-btn-primary mt-2 gap-1.5 h-8 px-3 text-xs"
            onClick={handleOpenCreateForm}
          >
            <Plus className="size-3.5" />
            <span>Start New Session</span>
          </Button>
        </div>
      )}
    </div>
  );
}
