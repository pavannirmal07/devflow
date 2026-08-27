import { useState } from "react";
import { Circle, Activity, CheckCircle2 } from "lucide-react";
import type { DevTask, TaskStatus, TaskSubtask, TaskTimeStats } from "../types";
import type { TaskGitHubLink } from "../../github/types";
import type { DevSession } from "../../sessions/types";
import { TaskCard } from "./TaskCard";
import "../tasks.css";

export interface TaskBoardProps {
  tasks: DevTask[];
  projectMap: Map<string, { name: string; color: string | null }>;
  subtasksMap: Record<string, TaskSubtask[]>;
  githubLinksMap: Record<string, TaskGitHubLink[]>;
  taskTimeMap: Record<string, TaskTimeStats>;
  activeSession?: DevSession | null;
  highlightTaskId?: string | null;
  onStartSession?: (task: DevTask) => void;
  onEdit: (task: DevTask) => void;
  onDelete: (taskId: string) => Promise<void>;
  onSubtasksChange?: (taskId: string, subtasks: TaskSubtask[]) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  deletingTaskId?: string | null;
  taskNotesCountMap?: Record<string, number>;
  onDocumentTechnicalIssue?: (task: DevTask) => void;
}

interface ColumnDef {
  status: TaskStatus;
  label: string;
  icon: typeof Circle;
  iconClass: string;
  emptyText: string;
}

const COLUMNS: ColumnDef[] = [
  {
    status: "todo",
    label: "To Do",
    icon: Circle,
    iconClass: "text-sky-500",
    emptyText: "No to-do tasks",
  },
  {
    status: "in_progress",
    label: "In Progress",
    icon: Activity,
    iconClass: "text-purple-500",
    emptyText: "No tasks in progress",
  },
  {
    status: "completed",
    label: "Completed",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    emptyText: "No completed tasks",
  },
];

export function TaskBoard({
  tasks,
  projectMap,
  subtasksMap,
  githubLinksMap,
  taskTimeMap,
  activeSession,
  highlightTaskId,
  onStartSession,
  onEdit,
  onDelete,
  onSubtasksChange,
  onStatusChange,
  deletingTaskId,
  taskNotesCountMap,
  onDocumentTechnicalIssue,
}: TaskBoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const columnTasks = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    completed: tasks.filter((t) => t.status === "completed"),
  };

  // Desktop HTML5 Drag Handlers
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    task: DevTask
  ) => {
    setDraggingTaskId(task.id);
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    status: TaskStatus
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== status) {
      setDragOverCol(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDragOverCol(null);
    }
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    status: TaskStatus
  ) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) {
      await onStatusChange(taskId, status);
    }
    setDraggingTaskId(null);
  };

  return (
    <div className="devflow-task-board" aria-label="Kanban task board">
      {COLUMNS.map((col) => {
        const colTaskList = columnTasks[col.status];
        const isOver = dragOverCol === col.status;
        const Icon = col.icon;

        return (
          <div
            key={col.status}
            data-stage-status={col.status}
            className={`devflow-kanban-column is-stage-${col.status} ${
              isOver ? "is-drag-over" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
            aria-label={`${col.label} column, ${colTaskList.length} tasks`}
          >
            <div className="devflow-kanban-column-header">
              <div className="devflow-kanban-column-title-wrap">
                <Icon className={`size-4 ${col.iconClass}`} />
                <h3 className="devflow-kanban-column-title">{col.label}</h3>
              </div>
              <span className="devflow-kanban-column-count">
                {colTaskList.length}
              </span>
            </div>

            <div className="devflow-kanban-column-content">
              {colTaskList.length === 0 ? (
                <div className="devflow-kanban-empty">
                  <span className="text-xs text-muted-foreground">
                    {col.emptyText}
                  </span>
                </div>
              ) : (
                colTaskList.map((task) => {
                  const projectInfo = task.project_id
                    ? projectMap.get(task.project_id)
                    : null;
                  const isBeingDragged = draggingTaskId === task.id;

                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectName={projectInfo ? projectInfo.name : null}
                      projectColor={projectInfo ? projectInfo.color : null}
                      onStartSession={onStartSession}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      isDeleting={deletingTaskId === task.id}
                      subtasks={subtasksMap[task.id] || []}
                      onSubtasksChange={onSubtasksChange}
                      githubLinks={githubLinksMap[task.id] || []}
                      timeStats={taskTimeMap[task.id]}
                      activeSession={activeSession}
                      onStatusChange={onStatusChange}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      isHighlighted={task.id === highlightTaskId}
                      className={isBeingDragged ? "is-dragging" : ""}
                      noteCount={taskNotesCountMap ? taskNotesCountMap[task.id] : undefined}
                      onDocumentTechnicalIssue={onDocumentTechnicalIssue}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
