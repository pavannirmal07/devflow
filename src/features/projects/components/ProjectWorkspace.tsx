import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  GitBranch,
  ExternalLink,
  Clock,
  Circle,
  Activity,
  CheckCircle2,
  Timer,
  AlertCircle,
  FolderKanban,
  Archive,
  RefreshCw,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/features/github/components/GitHubIcon";
import { useTasks } from "@/features/tasks/useTasks";
import { useSessions, TaskCompletionPrompt, type TaskCompletionPromptState } from "@/features/sessions";
import { useKnowledge, NoteModal, NoteCard, type CreateKnowledgeNoteInput, type KnowledgeNote } from "@/features/knowledge";
import { TaskBoard } from "@/features/tasks/components/TaskBoard";
import { CreateTaskModal } from "@/features/tasks/components/CreateTaskModal";
import { EditTaskModal } from "@/features/tasks/components/EditTaskModal";
import { DashboardActiveSessionCard } from "@/features/dashboard/components/DashboardActiveSessionCard";
import type { DevTask, TaskStatus } from "@/features/tasks/types";
import { formatDuration, computeSessionDuration } from "@/features/tasks/utils/duration";
import type { DevProject } from "../types";
import { deriveProjectMetrics } from "../utils/projectMetrics";
import "@/features/dashboard/dashboard.css";
import "@/features/knowledge/knowledge.css";

export interface ProjectWorkspaceProps {
  userId: string;
  project: DevProject;
  projects: DevProject[];
  highlightTaskId?: string | null;
  onBack: () => void;
  onEditProject: (project: DevProject) => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectWorkspace({
  userId,
  project,
  projects,
  highlightTaskId,
  onBack,
  onEditProject,
}: ProjectWorkspaceProps) {
  const {
    tasks,
    subtasksMap,
    githubLinksMap,
    taskTimeMap,
    updateTaskSubtasks,
    updateTaskGitHubLinks,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks,
  } = useTasks(userId);

  const {
    sessions,
    activeSession,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
  } = useSessions(userId);

  const { notes, createNote, togglePinNote } = useKnowledge(userId);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DevTask | null>(null);
  const [documentingTask, setDocumentingTask] = useState<DevTask | null>(null);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [taskCompletionPrompt, setTaskCompletionPrompt] =
    useState<TaskCompletionPromptState | null>(null);

  // Fast project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    for (const p of projects) {
      map.set(p.id, { name: p.name, color: p.color });
    }
    return map;
  }, [projects]);

  // Tasks belonging to this project
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.project_id === project.id);
  }, [tasks, project.id]);

  // Technical notes belonging to this project
  const projectNotes = useMemo(() => {
    return notes.filter((n) => n.project_id === project.id);
  }, [notes, project.id]);

  // Technical notes mapped by task_id
  const { taskNotesMap, taskNotesCountMap } = useMemo(() => {
    const nMap: Record<string, KnowledgeNote[]> = {};
    const cMap: Record<string, number> = {};
    for (const n of notes) {
      if (n.task_id) {
        if (!nMap[n.task_id]) nMap[n.task_id] = [];
        nMap[n.task_id].push(n);
        cMap[n.task_id] = (cMap[n.task_id] || 0) + 1;
      }
    }
    return { taskNotesMap: nMap, taskNotesCountMap: cMap };
  }, [notes]);

  const handleOpenNote = (noteId: string) => {
    window.history.pushState(null, "", `#knowledge/${noteId}`);
    window.dispatchEvent(new Event("hashchange"));
  };

  const handleViewAllKnowledge = () => {
    window.history.pushState(null, "", `#knowledge`);
    window.dispatchEvent(new Event("hashchange"));
  };

  // Active session linked details
  const activeLinkedTask = activeSession?.task_id
    ? tasks.find((t) => t.id === activeSession.task_id) || null
    : null;

  const activeLinkedGitHubLinks = activeSession?.task_id
    ? githubLinksMap[activeSession.task_id] || []
    : [];

  const activeProjectInfo = activeLinkedTask?.project_id
    ? projectMap.get(activeLinkedTask.project_id)
    : (activeSession?.task_id && projectTasks.some((t) => t.id === activeSession.task_id)
      ? { name: project.name, color: project.color }
      : null);

  const activeSessionProjectName = activeProjectInfo ? activeProjectInfo.name : project.name;
  const activeSessionProjectColor = activeProjectInfo ? activeProjectInfo.color : project.color;

  // Ticking effect if an active session is running for a task in this project
  const isProjectSessionActive = Boolean(
    activeSession &&
      activeSession.status === "active" &&
      activeSession.task_id &&
      projectTasks.some((t) => t.id === activeSession.task_id)
  );

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isProjectSessionActive) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isProjectSessionActive]);

  // Derived in-memory metrics
  const metrics = useMemo(() => {
    void tick;
    return deriveProjectMetrics(project.id, tasks, sessions, activeSession);
  }, [project.id, tasks, sessions, activeSession, tick]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target || target.status === newStatus) return;

    setActionError(null);
    const { error: updateErr } = await updateTask(taskId, { status: newStatus });
    if (updateErr) {
      setActionError(updateErr.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
    setActionError(null);
    const { error: delError } = await deleteTask(taskId);
    setDeletingTaskId(null);
    if (delError) {
      setActionError(delError.message);
    }
  };

  const handleStartSession = async (task: DevTask) => {
    if (task.status === "completed") {
      setSessionWarning("Completed tasks cannot start a focus session. Reopen the task first.");
      return;
    }

    if (activeSession) {
      setSessionWarning(
        `A session is already in progress (${activeSession.status === "paused" ? "paused" : "active"}: "${activeSession.title}"). Please complete your current session before starting a new one.`
      );
      return;
    }

    setSessionWarning(null);
    setActionError(null);

    const { session, error: startErr } = await startSession({
      title: task.title,
      description: task.description || undefined,
      task_id: task.id,
    });

    if (startErr) {
      setActionError(startErr.message);
    } else if (session) {
      await refreshTasks();
      // Remain directly inside the Project Workspace
    }
  };

  const handlePauseSession = async (sessionId: string) => {
    setIsActionLoading(true);
    setActionError(null);
    const { error } = await pauseSession(sessionId);
    setIsActionLoading(false);
    if (error) {
      setActionError(error.message);
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    setIsActionLoading(true);
    setActionError(null);
    const { error } = await resumeSession(sessionId);
    setIsActionLoading(false);
    if (error) {
      setActionError(error.message);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    setIsActionLoading(true);
    setActionError(null);

    const targetSession =
      activeSession?.id === sessionId
        ? activeSession
        : sessions.find((s) => s.id === sessionId);

    const finalDuration = targetSession
      ? computeSessionDuration(targetSession)
      : 0;

    const linkedTask = targetSession?.task_id
      ? tasks.find((t) => t.id === targetSession.task_id) || null
      : null;

    const { session, error } = await endSession(sessionId);
    setIsActionLoading(false);

    if (error) {
      setActionError(error.message);
    } else if (session && linkedTask && linkedTask.status !== "completed") {
      setTaskCompletionPrompt({
        taskId: linkedTask.id,
        taskTitle: linkedTask.title,
        durationSeconds: finalDuration,
      });
      await refreshTasks();
    } else {
      await refreshTasks();
    }
  };

  const projectColor = project.color || "#a855f7";
  const hasGitHub = Boolean(project.github_owner && project.github_repo);

  return (
    <div className="devflow-project-workspace">
      {/* Top Breadcrumb & Return Bar */}
      <div className="devflow-project-workspace-topbar">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="devflow-project-back-btn text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5"
          aria-label="Back to Projects"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Projects</span>
        </Button>
      </div>

      {/* Action / Error Banner */}
      {actionError && (
        <div className="devflow-task-alert is-error" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setActionError(null);
              void refreshTasks();
            }}
          >
            <RefreshCw className="size-3 mr-1" />
            <span>Try Again</span>
          </Button>
        </div>
      )}

      {/* Session Warning Banner */}
      {sessionWarning && (
        <div className="devflow-task-alert is-warning" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{sessionWarning}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="devflow-alert-btn devflow-alert-btn-dismiss"
            onClick={() => setSessionWarning(null)}
            aria-label="Dismiss warning"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Project Header Card */}
      <div className="devflow-project-workspace-header">
        <div className="devflow-project-workspace-header-main">
          <div className="devflow-project-workspace-title-row">
            <span
              className="devflow-project-workspace-color-dot"
              style={{ backgroundColor: projectColor }}
            />
            <h1 className="devflow-project-workspace-title">{project.name}</h1>

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
            <p className="devflow-project-workspace-description">
              {project.description}
            </p>
          ) : (
            <p className="devflow-project-workspace-description italic text-muted-foreground/60">
              No description provided for this project.
            </p>
          )}

          {/* GitHub Repository Context */}
          {hasGitHub && (
            <div className="devflow-project-workspace-github-row">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <a
                  href={
                    project.github_url ||
                    `https://github.com/${project.github_owner}/${project.github_repo}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="devflow-project-workspace-repo-pill"
                  title="Open repository on GitHub"
                >
                  <GitHubIcon className="size-3.5 shrink-0" />
                  <span className="truncate font-medium">
                    {project.github_owner}/{project.github_repo}
                  </span>
                  <ExternalLink className="size-3 shrink-0 opacity-70" />
                </a>

                {project.github_default_branch && (
                  <span className="devflow-project-workspace-branch-pill" title="Default branch">
                    <GitBranch className="size-3 shrink-0 text-muted-foreground" />
                    <span>{project.github_default_branch}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Header Actions */}
        <div className="devflow-project-workspace-header-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEditProject(project)}
            className="devflow-btn-secondary h-9 px-3 text-xs gap-1.5"
            aria-label="Edit project"
          >
            <Pencil className="size-3.5" />
            <span>Edit Project</span>
          </Button>

          <Button
            type="button"
            className="devflow-btn-primary h-9 px-4 text-xs gap-1.5"
            onClick={() => setIsCreateTaskOpen(true)}
          >
            <Plus className="size-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Active Focus Session Card (Prominent when running/paused) */}
      {activeSession && (
        <div className="devflow-project-workspace-active-session">
          <DashboardActiveSessionCard
            activeSession={activeSession}
            linkedTask={activeLinkedTask}
            linkedGitHubLinks={activeLinkedGitHubLinks}
            projectName={activeSessionProjectName}
            projectColor={activeSessionProjectColor}
            onPause={handlePauseSession}
            onResume={handleResumeSession}
            onComplete={handleCompleteSession}
            onStartNewSession={() => {}}
            isActionLoading={isActionLoading}
          />
        </div>
      )}

      {/* Metrics Row */}
      <div className="devflow-project-metrics-grid" aria-label="Project metrics">
        <div className="devflow-project-metric-card">
          <div className="devflow-project-metric-label">Total Tasks</div>
          <div className="devflow-project-metric-value">{metrics.totalTasks}</div>
        </div>

        <div className="devflow-project-metric-card is-todo">
          <div className="devflow-project-metric-label flex items-center gap-1.5">
            <Circle className="size-3 text-sky-500" />
            <span>To Do</span>
          </div>
          <div className="devflow-project-metric-value">
            {metrics.todoTasks}
          </div>
        </div>

        <div className="devflow-project-metric-card is-in_progress">
          <div className="devflow-project-metric-label flex items-center gap-1.5">
            <Activity className="size-3 text-purple-500" />
            <span>In Progress</span>
          </div>
          <div className="devflow-project-metric-value">
            {metrics.inProgressTasks}
          </div>
        </div>

        <div className="devflow-project-metric-card is-completed">
          <div className="devflow-project-metric-label flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-emerald-500" />
            <span>Completed</span>
          </div>
          <div className="devflow-project-metric-value">
            {metrics.completedTasks}
          </div>
        </div>

        <div className="devflow-project-metric-card is-focus-time">
          <div className="devflow-project-metric-label flex items-center gap-1.5">
            <Clock className="size-3 text-accent" />
            <span>Focus Time</span>
          </div>
          <div className="devflow-project-metric-value font-mono text-foreground">
            {formatDuration(metrics.totalFocusSeconds)}
          </div>
        </div>
      </div>

      {/* Project Kanban Board Section */}
      <div className="devflow-project-workspace-section">
        <div className="devflow-project-workspace-section-header">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-accent shrink-0" />
            <h2 className="text-base font-bold text-foreground">Project Tasks</h2>
            <span className="devflow-filter-count">{projectTasks.length}</span>
          </div>
        </div>

        {projectTasks.length === 0 ? (
          <div className="devflow-projects-empty">
            <FolderKanban className="devflow-empty-icon" />
            <h3 className="devflow-empty-title">No tasks in this project yet</h3>
            <p className="devflow-empty-desc">
              Create a task to start tracking development work for {project.name}.
            </p>
            <Button
              type="button"
              className="devflow-btn-primary mt-2 gap-1.5 h-8 px-3.5 text-xs"
              onClick={() => setIsCreateTaskOpen(true)}
            >
              <Plus className="size-3.5" />
              <span>Create Task</span>
            </Button>
          </div>
        ) : (
          <TaskBoard
            tasks={projectTasks}
            projectMap={projectMap}
            subtasksMap={subtasksMap}
            githubLinksMap={githubLinksMap}
            taskTimeMap={taskTimeMap}
            activeSession={activeSession}
            highlightTaskId={highlightTaskId}
            onStartSession={handleStartSession}
            onEdit={(t) => setEditingTask(t)}
            onDelete={handleDeleteTask}
            onSubtasksChange={updateTaskSubtasks}
            onStatusChange={handleStatusChange}
            deletingTaskId={deletingTaskId}
            taskNotesCountMap={taskNotesCountMap}
            onDocumentTechnicalIssue={(t) => setDocumentingTask(t)}
          />
        )}
      </div>

      {/* Technical Knowledge Section */}
      <div className="devflow-project-workspace-section">
        <div className="devflow-project-workspace-section-header">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-accent shrink-0" />
            <h2 className="text-base font-bold text-foreground">Technical Knowledge</h2>
            {projectNotes.length > 0 && (
              <span className="devflow-filter-count">{projectNotes.length}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleViewAllKnowledge}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1"
            >
              <span>View all knowledge</span>
              <ChevronRight className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateNoteOpen(true)}
              className="h-8 px-3 text-xs gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>New Note</span>
            </Button>
          </div>
        </div>

        {projectNotes.length === 0 ? (
          <div className="devflow-knowledge-empty py-8">
            <BookOpen className="devflow-knowledge-empty-icon size-6" />
            <h3 className="text-sm font-semibold text-foreground">
              No technical notes for this project yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm text-center">
              Capture engineering decisions, debugging investigations, and solutions specific to {project.name}.
            </p>
            <Button
              type="button"
              className="devflow-btn-primary mt-1 gap-1.5 h-8 px-3.5 text-xs"
              onClick={() => setIsCreateNoteOpen(true)}
            >
              <Plus className="size-3.5" />
              <span>Create Note</span>
            </Button>
          </div>
        ) : (
          <div className="devflow-project-knowledge-grid">
            {projectNotes.slice(0, 6).map((note) => {
              const taskTitle = note.task_id
                ? tasks.find((t) => t.id === note.task_id)?.title
                : null;
              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  projectName={project.name}
                  projectColor={project.color}
                  taskTitle={taskTitle}
                  onSelect={() => handleOpenNote(note.id)}
                  onTogglePin={(id, isPinned) => void togglePinNote(id, isPinned)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Focus Sessions Section */}
      <div className="devflow-project-workspace-section">
        <div className="devflow-project-workspace-section-header">
          <div className="flex items-center gap-2">
            <Timer className="size-4 text-accent shrink-0" />
            <h2 className="text-base font-bold text-foreground">Recent Focus Sessions</h2>
            {metrics.recentSessions.length > 0 && (
              <span className="devflow-filter-count">
                {metrics.recentSessions.length}
              </span>
            )}
          </div>
        </div>

        {metrics.recentSessions.length === 0 ? (
          <div className="devflow-project-workspace-sessions-empty">
            <Timer className="size-5 text-muted-foreground opacity-60" />
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-foreground">
                No focus sessions yet.
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                Start a focus session from a project task to begin tracking time.
              </p>
            </div>
          </div>
        ) : (
          <div className="devflow-project-workspace-sessions-list">
            {metrics.recentSessions.map((session) => (
              <div
                key={session.id}
                className={`devflow-project-workspace-session-row ${
                  session.status === "active" ? "is-active" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`devflow-project-session-status-dot is-${session.status}`}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {session.title}
                    </span>
                    {session.taskTitle && session.taskTitle !== session.title && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        Task: {session.taskTitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="font-mono font-semibold text-foreground">
                    {formatDuration(session.durationSeconds)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(session.startedAt)}
                  </span>
                  <span
                    className={`devflow-task-time-session-status-badge is-${session.status}`}
                  >
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal pre-filled with this project */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        projects={projects}
        defaultProjectId={project.id}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={createTask}
        onLinkCreated={updateTaskGitHubLinks}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        projects={projects}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSubmit={updateTask}
        subtasks={editingTask ? subtasksMap[editingTask.id] || [] : []}
        onSubtasksChange={updateTaskSubtasks}
        githubLinks={editingTask ? githubLinksMap[editingTask.id] || [] : []}
        onGitHubLinksChange={updateTaskGitHubLinks}
        timeStats={editingTask ? taskTimeMap[editingTask.id] : undefined}
        activeSession={activeSession}
        onStartSession={handleStartSession}
        taskNotes={editingTask ? taskNotesMap[editingTask.id] || [] : []}
        onDocumentTechnicalIssue={(t) => setDocumentingTask(t)}
        onOpenNote={handleOpenNote}
      />

      {/* New Project Note Modal */}
      <NoteModal
        isOpen={isCreateNoteOpen}
        onClose={() => setIsCreateNoteOpen(false)}
        projects={projects}
        tasks={tasks}
        initialProjectId={project.id}
        onSubmit={async (input) => {
          const res = await createNote(input as CreateKnowledgeNoteInput);
          if (res.error) {
            setActionError(res.error.message);
          }
          return res;
        }}
      />

      {/* Document Technical Issue Modal */}
      <NoteModal
        isOpen={Boolean(documentingTask)}
        onClose={() => setDocumentingTask(null)}
        projects={projects}
        tasks={tasks}
        initialProjectId={documentingTask?.project_id || project.id}
        initialTaskId={documentingTask?.id}
        initialTitle={documentingTask?.title}
        onSubmit={async (input) => {
          const res = await createNote(input as CreateKnowledgeNoteInput);
          if (res.error) {
            setActionError(res.error.message);
          }
          return res;
        }}
      />

      {/* Task Completion Decision Prompt */}
      {taskCompletionPrompt && (
        <TaskCompletionPrompt
          promptState={taskCompletionPrompt}
          onKeepInProgress={() => setTaskCompletionPrompt(null)}
          onMarkTaskDone={async () => {
            if (taskCompletionPrompt) {
              await updateTask(taskCompletionPrompt.taskId, { status: "completed" });
              setTaskCompletionPrompt(null);
            }
          }}
          isUpdatingTask={false}
        />
      )}
    </div>
  );
}
