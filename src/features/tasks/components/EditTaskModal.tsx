import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DevProject } from "@/features/projects";
import type { DevTask, TaskPriority, TaskStatus, TaskSubtask, UpdateTaskInput } from "../types";
import { SubtaskList } from "./SubtaskList";

export interface EditTaskModalProps {
  task: DevTask | null;
  projects: DevProject[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    taskId: string,
    input: UpdateTaskInput
  ) => Promise<{ task: DevTask | null; error: Error | null }>;
  subtasks?: TaskSubtask[];
  onSubtasksChange?: (taskId: string, subtasks: TaskSubtask[]) => void;
}

export function EditTaskModal({
  task,
  projects,
  isOpen,
  onClose,
  onSubmit,
  subtasks,
  onSubtasksChange,
}: EditTaskModalProps) {
  if (!isOpen || !task) return null;

  return (
    <EditTaskModalForm
      key={task.id}
      task={task}
      projects={projects}
      onClose={onClose}
      onSubmit={onSubmit}
      initialSubtasks={subtasks}
      onSubtasksChange={
        onSubtasksChange ? (subs) => onSubtasksChange(task.id, subs) : undefined
      }
    />
  );
}

interface EditTaskModalFormProps {
  task: DevTask;
  projects: DevProject[];
  onClose: () => void;
  onSubmit: (
    taskId: string,
    input: UpdateTaskInput
  ) => Promise<{ task: DevTask | null; error: Error | null }>;
  initialSubtasks?: TaskSubtask[];
  onSubtasksChange?: (subtasks: TaskSubtask[]) => void;
}

function EditTaskModalForm({
  task,
  projects,
  onClose,
  onSubmit,
  initialSubtasks,
  onSubtasksChange,
}: EditTaskModalFormProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [projectId, setProjectId] = useState<string>(task.project_id || "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { task: updated, error } = await onSubmit(task.id, {
      title: trimmedTitle,
      description: description.trim() || null,
      project_id: projectId || null,
      status,
      priority,
      due_date: dueDate || null,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (updated) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <div
      className="devflow-task-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-title"
    >
      <div className="devflow-task-modal-card">
        <div className="devflow-task-modal-header">
          <h2 id="edit-task-title" className="devflow-task-modal-title">
            Edit Task
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X className="size-4" />
          </Button>
        </div>

        {errorMessage && (
          <div className="devflow-task-alert is-error" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="devflow-task-modal-fields">
            <div className="devflow-field-group">
              <Label htmlFor="edit-task-title-input" className="devflow-field-label">
                Task Title <span className="text-destructive">*</span>
              </Label>
              <input
                id="edit-task-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
                className="devflow-task-input"
              />
            </div>

            <div className="devflow-field-group">
              <Label htmlFor="edit-task-desc" className="devflow-field-label">
                Description (optional)
              </Label>
              <textarea
                id="edit-task-desc"
                rows={3}
                placeholder="Details, steps, or acceptance criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="devflow-task-textarea"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="devflow-field-group">
                <Label htmlFor="edit-task-project" className="devflow-field-label">
                  Project (optional)
                </Label>
                <select
                  id="edit-task-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-task-select"
                >
                  <option value="">No Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="devflow-field-group">
                <Label htmlFor="edit-task-due-date" className="devflow-field-label">
                  Due Date (optional)
                </Label>
                <input
                  id="edit-task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-task-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="devflow-field-group">
                <Label htmlFor="edit-task-status" className="devflow-field-label">
                  Status
                </Label>
                <select
                  id="edit-task-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  disabled={isSubmitting}
                  className="devflow-task-select"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="devflow-field-group">
                <Label htmlFor="edit-task-priority" className="devflow-field-label">
                  Priority
                </Label>
                <select
                  id="edit-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={isSubmitting}
                  className="devflow-task-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Subtasks Management Section */}
            <SubtaskList
              taskId={task.id}
              initialSubtasks={initialSubtasks}
              onSubtasksChange={onSubtasksChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="devflow-task-modal-actions">
            <Button
              type="button"
              className="devflow-btn-secondary h-9 px-4"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="devflow-btn-primary h-9 px-4"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
