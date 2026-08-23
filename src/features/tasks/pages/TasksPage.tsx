import { useState, useMemo } from "react";
import { Plus, ListTodo, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/projects";
import { useTasks } from "../useTasks";
import { TaskCard } from "../components/TaskCard";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { EditTaskModal } from "../components/EditTaskModal";
import type { DevTask, TaskStatus } from "../types";
import "../tasks.css";

export interface TasksPageProps {
  userId: string;
}

type FilterStatus = "all" | TaskStatus;

export function TasksPage({ userId }: TasksPageProps) {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks,
  } = useTasks(userId);

  const { projects } = useProjects(userId);

  const [activeStatusFilter, setActiveStatusFilter] = useState<FilterStatus>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DevTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Map projects for fast lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    projects.forEach((p) => {
      map.set(p.id, { name: p.name, color: p.color });
    });
    return map;
  }, [projects]);

  // Counts for status pills
  const counts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    };
  }, [tasks]);

  // Filtered tasks based on status and project
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus =
        activeStatusFilter === "all" || task.status === activeStatusFilter;
      const matchesProject =
        selectedProjectId === "all" ||
        (selectedProjectId === "none"
          ? !task.project_id
          : task.project_id === selectedProjectId);
      return matchesStatus && matchesProject;
    });
  }, [tasks, activeStatusFilter, selectedProjectId]);

  const handleDelete = async (taskId: string) => {
    setDeletingTaskId(taskId);
    setActionError(null);
    const { error: delError } = await deleteTask(taskId);
    setDeletingTaskId(null);
    if (delError) {
      setActionError(delError.message);
    }
  };

  return (
    <div className="devflow-tasks-page">
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

      {/* Filter and Control Row */}
      <div className="devflow-tasks-controls-row">
        <div className="devflow-tasks-filter-bar" role="tablist" aria-label="Task status filters">
          <button
            type="button"
            role="tab"
            aria-selected={activeStatusFilter === "all"}
            className={`devflow-filter-pill ${
              activeStatusFilter === "all" ? "is-active" : ""
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
            className={`devflow-filter-pill ${
              activeStatusFilter === "todo" ? "is-active" : ""
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
            className={`devflow-filter-pill ${
              activeStatusFilter === "in_progress" ? "is-active" : ""
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
            className={`devflow-filter-pill ${
              activeStatusFilter === "completed" ? "is-active" : ""
            }`}
            onClick={() => setActiveStatusFilter("completed")}
          >
            <span>Completed</span>
            <span className="devflow-filter-count">{counts.completed}</span>
          </button>
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
                onEdit={(t) => setEditingTask(t)}
                onDelete={handleDelete}
                isDeleting={deletingTaskId === task.id}
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
      />
    </div>
  );
}
