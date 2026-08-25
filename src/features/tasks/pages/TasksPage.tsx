import { useState, useMemo } from "react";
import { Plus, ListTodo, AlertCircle, RefreshCw, LayoutList, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/projects";
import { useSessions } from "@/features/sessions";
import { useTasks } from "../useTasks";
import { TaskCard } from "../components/TaskCard";
import { TaskBoard } from "../components/TaskBoard";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { EditTaskModal } from "../components/EditTaskModal";
import type { DevTask, TaskDueDateFilter, TaskStatus } from "../types";
import { isTaskDueThisWeek, isTaskDueToday, isTaskOverdue } from "../utils/dueDate";
import "../tasks.css";

export interface TasksPageProps {
  userId: string;
  highlightTaskId?: string | null;
}

type FilterStatus = "all" | TaskStatus;

export function TasksPage({ userId, highlightTaskId }: TasksPageProps) {
  const {
    tasks,
    subtasksMap,
    githubLinksMap,
    taskTimeMap,
    updateTaskSubtasks,
    updateTaskGitHubLinks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks,
  } = useTasks(userId);

  const { projects } = useProjects(userId);
  const { activeSession, startSession } = useSessions(userId);

  const [activeStatusFilter, setActiveStatusFilter] = useState<FilterStatus>("all");
  const [activeDateFilter, setActiveDateFilter] = useState<TaskDueDateFilter>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DevTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "board">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("devflow_tasks_view_mode");
      if (saved === "board" || saved === "list") return saved;
    }
    return "list";
  });

  const handleViewModeChange = (mode: "list" | "board") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("devflow_tasks_view_mode", mode);
      } catch {
        // ignore storage errors
      }
    }
  };

  // Map projects for fast lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    projects.forEach((p) => {
      map.set(p.id, { name: p.name, color: p.color });
    });
    return map;
  }, [projects]);

  // Counts for status pills and date intelligence (single pass O(N) scan)
  const counts = useMemo(() => {
    let todo = 0;
    let in_progress = 0;
    let completed = 0;
    let overdue = 0;
    let today = 0;
    let thisWeek = 0;

    for (const t of tasks) {
      if (t.status === "todo") todo++;
      else if (t.status === "in_progress") in_progress++;
      else if (t.status === "completed") completed++;

      if (isTaskOverdue(t)) overdue++;
      if (isTaskDueToday(t)) today++;
      if (isTaskDueThisWeek(t)) thisWeek++;
    }

    return {
      all: tasks.length,
      todo,
      in_progress,
      completed,
      overdue,
      today,
      thisWeek,
    };
  }, [tasks]);

  // Filtered tasks based on status, project, and intelligent due date
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus =
        activeStatusFilter === "all" || task.status === activeStatusFilter;
      const matchesProject =
        selectedProjectId === "all" ||
        (selectedProjectId === "none"
          ? !task.project_id
          : task.project_id === selectedProjectId);
      const matchesDate =
        activeDateFilter === "all" ||
        (activeDateFilter === "today" && isTaskDueToday(task)) ||
        (activeDateFilter === "this_week" && isTaskDueThisWeek(task)) ||
        (activeDateFilter === "overdue" && isTaskOverdue(task));

      return matchesStatus && matchesProject && matchesDate;
    });
  }, [tasks, activeStatusFilter, selectedProjectId, activeDateFilter]);


  const handleDelete = async (taskId: string) => {
    setDeletingTaskId(taskId);
    setActionError(null);
    const { error: delError } = await deleteTask(taskId);
    setDeletingTaskId(null);
    if (delError) {
      setActionError(delError.message);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target || target.status === newStatus) return;

    setActionError(null);
    const { error: updateErr } = await updateTask(taskId, { status: newStatus });
    if (updateErr) {
      setActionError(updateErr.message);
    }
  };

  const handleStartFocusSession = async (task: DevTask) => {
    if (task.status === "completed") {
      setSessionWarning("Completed tasks cannot start a focus session. Reopen the task first.");
      return;
    }

    // Sessions V2 defines in-progress as active OR paused
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
      window.location.hash = "sessions";
    }
  };

  return (
    <div className={`devflow-tasks-page ${viewMode === "board" ? "is-board-view" : ""}`}>
      {/* Header */}
      <div className="devflow-tasks-header">
        <div className="devflow-tasks-title-group">
          <h1>Tasks</h1>
          <p className="devflow-tasks-subtitle">
            Plan, prioritize, and track your development work.
          </p>
        </div>
        <Button
          type="button"
          className="devflow-btn-primary h-9 px-4 text-sm"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="size-4 mr-1.5" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Action / Error Banner */}
      {(error || actionError) && (
        <div className="devflow-task-alert is-error" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error || actionError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setActionError(null);
              refreshTasks();
            }}
          >
            <RefreshCw className="size-3 mr-1" />
            <span>Try Again</span>
          </Button>
        </div>
      )}

      {/* Active Session Warning Banner */}
      {sessionWarning && (
        <div className="devflow-task-alert is-warning" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{sessionWarning}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="devflow-alert-btn devflow-alert-btn-secondary"
              onClick={() => {
                window.location.hash = "sessions";
              }}
            >
              View Session
            </Button>
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
        </div>
      )}

      {/* Filter and Control Row */}
      <div className="devflow-tasks-controls-row">
        <div className="devflow-tasks-filter-bar" role="tablist" aria-label="Task status filters">
          <button
            type="button"
            role="tab"
            aria-selected={activeStatusFilter === "all"}
            className={`devflow-filter-pill ${activeStatusFilter === "all" ? "is-active" : ""
              }`}
            onClick={() => setActiveStatusFilter("all")}
          >
            <span>All</span>
            <span className="devflow-filter-count">{counts.all}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatusFilter === "todo"}
            className={`devflow-filter-pill ${activeStatusFilter === "todo" ? "is-active" : ""
              }`}
            onClick={() => setActiveStatusFilter("todo")}
          >
            <span>To Do</span>
            <span className="devflow-filter-count">{counts.todo}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatusFilter === "in_progress"}
            className={`devflow-filter-pill ${activeStatusFilter === "in_progress" ? "is-active" : ""
              }`}
            onClick={() => setActiveStatusFilter("in_progress")}
          >
            <span>In Progress</span>
            <span className="devflow-filter-count">{counts.in_progress}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatusFilter === "completed"}
            className={`devflow-filter-pill ${activeStatusFilter === "completed" ? "is-active" : ""
              }`}
            onClick={() => setActiveStatusFilter("completed")}
          >
            <span>Completed</span>
            <span className="devflow-filter-count">{counts.completed}</span>
          </button>
        </div>

        <div className="devflow-tasks-secondary-filters">
          {/* List / Board View Toggle */}
          <div className="devflow-tasks-view-toggle-group" role="group" aria-label="View mode toggle">
            <button
              type="button"
              className={`devflow-view-toggle-btn ${viewMode === "list" ? "is-active" : ""}`}
              onClick={() => handleViewModeChange("list")}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
              title="List view"
            >
              <LayoutList className="size-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              className={`devflow-view-toggle-btn ${viewMode === "board" ? "is-active" : ""}`}
              onClick={() => handleViewModeChange("board")}
              aria-pressed={viewMode === "board"}
              aria-label="Board view"
              title="Board view"
            >
              <Columns3 className="size-3.5" />
              <span>Board</span>
            </button>
          </div>

          <div className="devflow-tasks-date-filter">
            <select
              value={activeDateFilter}
              onChange={(e) => setActiveDateFilter(e.target.value as TaskDueDateFilter)}
              className={`devflow-task-select text-xs py-1.5 ${
                activeDateFilter === "overdue"
                  ? "is-overdue"
                  : activeDateFilter === "today"
                  ? "is-today"
                  : ""
              }`}
              aria-label="Filter tasks by due date"
            >
              <option value="all">Date: All</option>
              <option value="today">
                Date: Today {counts.today > 0 ? `(${counts.today})` : ""}
              </option>
              <option value="this_week">
                Date: This Week {counts.thisWeek > 0 ? `(${counts.thisWeek})` : ""}
              </option>
              <option value="overdue">
                Date: Overdue {counts.overdue > 0 ? `(${counts.overdue})` : ""}
              </option>
            </select>
          </div>

          {projects.length > 0 && (
            <div className="devflow-tasks-project-filter">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="devflow-task-select text-xs py-1.5"
                aria-label="Filter tasks by project"
              >
                <option value="all">All Projects</option>
                <option value="none">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>


      {/* Main Content Area */}
      {loading ? (
        <div className="devflow-tasks-grid" aria-label="Loading tasks">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="devflow-task-skeleton">
              <div className="devflow-skeleton-bar is-short" />
              <div className="devflow-skeleton-bar is-title" />
              <div className="devflow-skeleton-bar is-sub" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="devflow-tasks-empty">
          <ListTodo className="devflow-empty-icon" />
          <h3 className="devflow-empty-title">No tasks yet</h3>
          <p className="devflow-empty-desc">
            Break your project milestones into bite-sized actionable development tasks.
          </p>
          <Button
            type="button"
            className="devflow-btn-primary h-9 px-4 text-sm mt-2"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4 mr-1.5" />
            <span>Create your first task</span>
          </Button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="devflow-tasks-empty">
          <ListTodo className="devflow-empty-icon" />
          <h3 className="devflow-empty-title">No matching tasks</h3>
          <p className="devflow-empty-desc">
            There are no tasks matching the selected filters.
          </p>
          <Button
            type="button"
            className="devflow-btn-secondary h-9 px-4 text-sm mt-2"
            onClick={() => {
              setActiveStatusFilter("all");
              setSelectedProjectId("all");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : viewMode === "board" ? (
        <TaskBoard
          tasks={filteredTasks}
          projectMap={projectMap}
          subtasksMap={subtasksMap}
          githubLinksMap={githubLinksMap}
          taskTimeMap={taskTimeMap}
          activeSession={activeSession}
          highlightTaskId={highlightTaskId}
          onStartSession={handleStartFocusSession}
          onEdit={(t) => setEditingTask(t)}
          onDelete={handleDelete}
          onSubtasksChange={updateTaskSubtasks}
          onStatusChange={handleStatusChange}
          deletingTaskId={deletingTaskId}
        />
      ) : (
        <div className="devflow-tasks-grid">
          {filteredTasks.map((task) => {
            const projectInfo = task.project_id
              ? projectMap.get(task.project_id)
              : null;
            return (
              <TaskCard
                key={task.id}
                task={task}
                projectName={projectInfo ? projectInfo.name : null}
                projectColor={projectInfo ? projectInfo.color : null}
                onStartSession={handleStartFocusSession}
                onEdit={(t) => setEditingTask(t)}
                onDelete={handleDelete}
                isDeleting={deletingTaskId === task.id}
                subtasks={subtasksMap[task.id] || []}
                onSubtasksChange={updateTaskSubtasks}
                githubLinks={githubLinksMap[task.id] || []}
                timeStats={taskTimeMap[task.id]}
                activeSession={activeSession}
                onStatusChange={handleStatusChange}
                isHighlighted={task.id === highlightTaskId}
              />
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        projects={projects}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={createTask}
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
        onStartSession={handleStartFocusSession}
      />
    </div>
  );
}
