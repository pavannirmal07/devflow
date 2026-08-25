import { useMemo, useState } from "react";
import { AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  useSessions,
  TaskCompletionPrompt,
  type TaskCompletionPromptState,
} from "../../sessions";
import { useTasks } from "../../tasks/useTasks";
import { useProjects } from "../../projects/useProjects";
import { useFocusGoal } from "../hooks/useFocusGoal";
import type { DevTask } from "../../tasks/types";
import type { NavItemId } from "../../../components/layout/AppShell";
import { DashboardActiveSessionCard } from "../components/DashboardActiveSessionCard";
import { DashboardFocusAgenda } from "../components/DashboardFocusAgenda";
import { DashboardVelocityCards } from "../components/DashboardVelocityCards";
import { DashboardProjectStreams } from "../components/DashboardProjectStreams";
import { deriveDashboardAgenda, deriveDashboardMetrics } from "../utils/dashboardMetrics";
import "../dashboard.css";

export interface DashboardPageProps {
  userId: string;
  userName?: string;
  onNavigate: (navId: NavItemId) => void;
}

function formatCurrentDate(): string {
  const now = new Date();
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function DashboardPage({
  userId,
  userName,
  onNavigate,
}: DashboardPageProps) {
  const {
    sessions,
    activeSession,
    pauseSession,
    resumeSession,
    endSession,
    startSession,
  } = useSessions(userId);

  const {
    tasks,
    subtasksMap,
    githubLinksMap,
    taskTimeMap,
    updateTask,
    refreshTasks,
  } = useTasks(userId);

  const { projects } = useProjects(userId);
  const { goalSeconds, setGoalSeconds } = useFocusGoal(userId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [taskCompletionPrompt, setTaskCompletionPrompt] =
    useState<TaskCompletionPromptState | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // Fast project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    for (const p of projects) {
      map.set(p.id, { name: p.name, color: p.color });
    }
    return map;
  }, [projects]);

  // Derived in-memory metrics with customizable focus target
  const metrics = useMemo(() => {
    return deriveDashboardMetrics(sessions, tasks, activeSession, goalSeconds);
  }, [sessions, tasks, activeSession, goalSeconds]);

  // Derived in-memory priority agenda with subtasks
  const agendaTasks = useMemo(() => {
    return deriveDashboardAgenda(tasks, projectMap, githubLinksMap, taskTimeMap, subtasksMap, 6);
  }, [tasks, projectMap, githubLinksMap, taskTimeMap, subtasksMap]);

  // Active session linked task details
  const activeLinkedTask = activeSession?.task_id
    ? tasks.find((t) => t.id === activeSession.task_id) || null
    : null;

  const activeLinkedGitHubLinks = activeSession?.task_id
    ? githubLinksMap[activeSession.task_id] || []
    : [];

  const activeProjectInfo = activeLinkedTask?.project_id
    ? projectMap.get(activeLinkedTask.project_id)
    : null;

  const handlePauseSession = async (sessionId: string) => {
    setIsActionLoading(true);
    setActionError(null);
    const { error } = await pauseSession(sessionId);
    setIsActionLoading(false);
    if (error) setActionError(error.message);
  };

  const handleResumeSession = async (sessionId: string) => {
    setIsActionLoading(true);
    setActionError(null);
    const { error } = await resumeSession(sessionId);
    setIsActionLoading(false);
    if (error) setActionError(error.message);
  };

  const handleCompleteSession = async (sessionId: string) => {
    setIsActionLoading(true);
    setActionError(null);
    const { session: completed, error } = await endSession(sessionId);
    setIsActionLoading(false);

    if (error) {
      setActionError(error.message);
    } else if (completed && completed.task_id) {
      const linkedTask = tasks.find((t) => t.id === completed.task_id);
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

  const handleStartSessionOnTask = async (task: DevTask) => {
    if (activeSession) {
      setActionError(
        `A session is already running ("${activeSession.title}"). Complete it before starting a new one.`
      );
      return;
    }
    setIsActionLoading(true);
    setActionError(null);
    const { session, error } = await startSession({
      title: task.title,
      description: task.description || undefined,
      task_id: task.id,
    });
    setIsActionLoading(false);

    if (error) {
      setActionError(error.message);
    } else if (session) {
      await refreshTasks();
    }
  };

  const handleStartGenericSession = () => {
    onNavigate("sessions");
  };

  const handleCompleteTask = async (taskId: string) => {
    setActionError(null);
    const { error } = await updateTask(taskId, { status: "completed" });
    if (error) setActionError(error.message);
  };

  return (
    <div className="devflow-dashboard-page">
      {/* Top Header / Welcome Row */}
      <div className="devflow-dashboard-header">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="devflow-dashboard-title">
            Command Center
          </h1>
          <p className="text-xs text-muted-foreground">
            {userName ? `Welcome back, ${userName}. ` : "Welcome back. "}
            {metrics.overdueTasksCount > 0
              ? `You have ${metrics.overdueTasksCount} overdue task${
                  metrics.overdueTasksCount === 1 ? "" : "s"
                } requiring attention.`
              : metrics.dueTodayTasksCount > 0
              ? `You have ${metrics.dueTodayTasksCount} task${
                  metrics.dueTodayTasksCount === 1 ? "" : "s"
                } due today.`
              : "All tasks on track. Ready for deep work."}
          </p>
        </div>

        <div className="devflow-dashboard-date-badge">
          <Calendar className="size-4 text-foreground/80 shrink-0" />
          <span>{formatCurrentDate()}</span>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="devflow-task-alert is-error" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-destructive" />
            <span className="text-xs">{actionError}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setActionError(null)}
          >
            Dismiss
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

      {/* Main Command Grid */}
      <div className="devflow-dashboard-grid">
        {/* Section 1: Active Focus Session Card (Full width prominence) */}
        <div className="devflow-dashboard-col-full">
          <DashboardActiveSessionCard
            activeSession={activeSession}
            linkedTask={activeLinkedTask}
            linkedGitHubLinks={activeLinkedGitHubLinks}
            projectName={activeProjectInfo ? activeProjectInfo.name : null}
            projectColor={activeProjectInfo ? activeProjectInfo.color : null}
            onPause={handlePauseSession}
            onResume={handleResumeSession}
            onComplete={handleCompleteSession}
            onStartNewSession={handleStartGenericSession}
            isActionLoading={isActionLoading}
          />
        </div>

        {/* Section 2: Developer Velocity Metric Cards */}
        <div className="devflow-dashboard-col-full">
          <DashboardVelocityCards
            metrics={metrics}
            onUpdateFocusGoal={setGoalSeconds}
          />
        </div>

        {/* Section 3: Today's Focus Agenda */}
        <div className="devflow-dashboard-col-left">
          <DashboardFocusAgenda
            agendaTasks={agendaTasks}
            onStartSession={handleStartSessionOnTask}
            onCompleteTask={handleCompleteTask}
            onNavigateToTasks={() => onNavigate("tasks")}
            disabled={isActionLoading}
          />
        </div>

        {/* Section 4: Active Project Streams */}
        <div className="devflow-dashboard-col-right">
          <DashboardProjectStreams
            projects={projects}
            tasks={tasks}
            onNavigateToProjects={() => onNavigate("projects")}
            onNavigateToTasksWithProject={() => onNavigate("tasks")}
            onCreateProject={() => onNavigate("projects")}
          />
        </div>
      </div>
    </div>
  );
}
