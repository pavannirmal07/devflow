import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DevProject } from "@/features/projects";
import type { CreateTaskInput, DevTask, TaskPriority, TaskStatus } from "../types";

export interface CreateTaskModalProps {
  isOpen: boolean;
  projects: DevProject[];
  onClose: () => void;
  onSubmit: (
    input: CreateTaskInput
  ) => Promise<{ task: DevTask | null; error: Error | null }>;
}

export function CreateTaskModal({
  isOpen,
  projects,
  onClose,
  onSubmit,
}: CreateTaskModalProps) {
  if (!isOpen) return null;

  return (
    <CreateTaskModalForm
      projects={projects}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface CreateTaskModalFormProps {
  projects: DevProject[];
  onClose: () => void;
  onSubmit: (
    input: CreateTaskInput
  ) => Promise<{ task: DevTask | null; error: Error | null }>;
}

function CreateTaskModalForm({
  projects,
  onClose,
  onSubmit,
}: CreateTaskModalFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { task, error } = await onSubmit({
      title: trimmedTitle,
      description: description.trim() || undefined,
      project_id: projectId || undefined,
      status,
      priority,
      due_date: dueDate ? dueDate : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (task) {
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
      aria-labelledby="create-task-title"
    >
      <div className="devflow-task-modal-card">
        <div className="devflow-task-modal-header">
          <h2 id="create-task-title" className="devflow-task-modal-title">
            Create New Task
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
              <Label htmlFor="create-task-title-input" className="devflow-field-label">
                Task Title <span className="text-destructive">*</span>
              </Label>
              <input
                id="create-task-title-input"
                type="text"
                placeholder="e.g. Implement authentication callback"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
                className="devflow-task-input"
              />
            </div>

            <div className="devflow-field-group">
              <Label htmlFor="create-task-desc" className="devflow-field-label">
                Description (optional)
              </Label>
              <textarea
                id="create-task-desc"
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
                <Label htmlFor="create-task-project" className="devflow-field-label">
                  Project (optional)
                </Label>
                <select
                  id="create-task-project"
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
                <Label htmlFor="create-task-due-date" className="devflow-field-label">
                  Due Date (optional)
                </Label>
                <input
                  id="create-task-due-date"
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
                <Label htmlFor="create-task-status" className="devflow-field-label">
                  Status
                </Label>
                <select
                  id="create-task-status"
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
                <Label htmlFor="create-task-priority" className="devflow-field-label">
                  Priority
                </Label>
                <select
                  id="create-task-priority"
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
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
