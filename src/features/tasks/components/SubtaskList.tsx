import { useState, useRef, useEffect } from "react";
import {
  Check,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  ListTodo,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubtasks } from "../useSubtasks";
import type { TaskSubtask } from "../types";

export interface SubtaskListProps {
  taskId: string;
  initialSubtasks?: TaskSubtask[];
  onSubtasksChange?: (subtasks: TaskSubtask[]) => void;
  className?: string;
  disabled?: boolean;
}

export function SubtaskList({
  taskId,
  initialSubtasks,
  onSubtasksChange,
  className = "",
  disabled = false,
}: SubtaskListProps) {
  const {
    subtasks,
    loading,
    error,
    progress,
    createSubtask,
    toggleSubtask,
    updateSubtask,
    deleteSubtask,
    moveSubtask,
  } = useSubtasks(taskId, {
    initialSubtasks,
    onSubtasksChange,
  });

  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleCreate = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setLocalError("Please enter a subtask title");
      inputRef.current?.focus();
      return;
    }
    if (isSubmittingNew || disabled) return;

    setLocalError(null);
    setIsSubmittingNew(true);
    const { error: createErr } = await createSubtask(trimmed);
    setIsSubmittingNew(false);

    if (createErr) {
      setLocalError(createErr.message);
    } else {
      setNewTitle("");
      setIsAdding(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const startEdit = (subtask: TaskSubtask) => {
    if (disabled) return;
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
    setLocalError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleSaveEdit = async (subtaskId: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setLocalError("Subtask title cannot be empty");
      editInputRef.current?.focus();
      return;
    }
    if (isSubmittingEdit || disabled) return;

    setLocalError(null);
    setIsSubmittingEdit(true);
    const { error: updateErr } = await updateSubtask(subtaskId, { title: trimmed });
    setIsSubmittingEdit(false);

    if (updateErr) {
      setLocalError(updateErr.message);
    } else {
      setEditingId(null);
      setEditTitle("");
    }
  };

  const displayedError = localError || error;

  return (
    <div className={`devflow-subtasks-wrapper ${className}`}>
      {/* Header & Progress Bar */}
      <div className="devflow-subtasks-header">
        <div className="devflow-subtasks-header-left">
          <span className="devflow-subtasks-title">Subtasks</span>
          {subtasks.length > 0 && (
            <span
              className="devflow-subtasks-counter"
              aria-label={`${progress.completed} of ${progress.total} subtasks completed`}
            >
              {progress.completed} / {progress.total}
            </span>
          )}
        </div>
        {subtasks.length > 0 && progress.percent === 100 && (
          <span className="devflow-subtasks-complete-badge">
            <CheckCircle2 className="size-3" />
            <span>All done</span>
          </span>
        )}
      </div>

      {subtasks.length > 0 && (
        <div
          className="devflow-subtasks-progress-track"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Subtasks completion progress"
        >
          <div
            className={`devflow-subtasks-progress-fill ${
              progress.percent === 100 ? "is-complete" : ""
            }`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      )}

      {displayedError && (
        <p className="text-xs text-destructive mt-1 font-medium">{displayedError}</p>
      )}

      {/* Subtasks List */}
      <div className="devflow-subtasks-list" role="list">
        {loading && subtasks.length === 0 ? (
          <div className="py-2 text-xs text-muted-foreground">Loading subtasks...</div>
        ) : subtasks.length === 0 && !isAdding ? (
          <div className="devflow-subtasks-empty">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <ListTodo className="size-4 opacity-70" />
              <span>No subtasks yet</span>
            </div>
            <Button
              type="button"
              className="devflow-btn-secondary h-7 px-3 text-xs"
              onClick={() => {
                setIsAdding(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              disabled={disabled}
            >
              <Plus className="size-3 mr-1" />
              <span>Add Subtask</span>
            </Button>
          </div>
        ) : (
          subtasks.map((subtask, index) => {
            const isEditing = editingId === subtask.id;

            return (
              <div
                key={subtask.id}
                role="listitem"
                className={`devflow-subtask-item ${
                  subtask.completed ? "is-completed" : ""
                }`}
              >
                {isEditing ? (
                  <div className="devflow-subtask-edit-form">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => {
                        setEditTitle(e.target.value);
                        if (localError) setLocalError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveEdit(subtask.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          cancelEdit();
                        }
                      }}
                      disabled={isSubmittingEdit || disabled}
                      className="devflow-subtask-edit-input"
                      placeholder="Subtask title..."
                      aria-label="Edit subtask title"
                      required
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleSaveEdit(subtask.id)}
                        disabled={!editTitle.trim() || isSubmittingEdit || disabled}
                        aria-label="Save subtask"
                        title="Save (Enter)"
                        className="hover:bg-emerald-500/10"
                      >
                        <Check className="size-3.5 text-emerald-500" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={isSubmittingEdit}
                        aria-label="Cancel editing"
                        title="Cancel (Esc)"
                      >
                        <X className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="devflow-subtask-checkbox-label">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={(e) => toggleSubtask(subtask.id, e.target.checked)}
                        disabled={disabled}
                        className="devflow-subtask-checkbox-input sr-only"
                        aria-label={`Mark "${subtask.title}" as ${
                          subtask.completed ? "incomplete" : "complete"
                        }`}
                      />
                      <span
                        className={`devflow-subtask-checkbox-custom ${
                          subtask.completed ? "is-checked" : ""
                        }`}
                        aria-hidden="true"
                      >
                        {subtask.completed && <Check className="size-3 text-white" />}
                      </span>
                      <span
                        className="devflow-subtask-text"
                        onDoubleClick={() => startEdit(subtask)}
                        title="Double-click to edit"
                      >
                        {subtask.title}
                      </span>
                    </label>

                    <div className="devflow-subtask-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="devflow-subtask-btn"
                        onClick={() => moveSubtask(subtask.id, "up")}
                        disabled={index === 0 || disabled}
                        aria-label="Move subtask up"
                        title="Move up"
                      >
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="devflow-subtask-btn"
                        onClick={() => moveSubtask(subtask.id, "down")}
                        disabled={index === subtasks.length - 1 || disabled}
                        aria-label="Move subtask down"
                        title="Move down"
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="devflow-subtask-btn"
                        onClick={() => startEdit(subtask)}
                        disabled={disabled}
                        aria-label="Edit subtask"
                        title="Edit subtask"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="devflow-subtask-btn text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSubtask(subtask.id)}
                        disabled={disabled}
                        aria-label="Delete subtask"
                        title="Delete subtask"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Subtask Input (non-nested form with Enter key support) */}
      {(subtasks.length > 0 || isAdding) && (
        <div className="devflow-subtask-add-form">
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a subtask..."
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              if (localError) setLocalError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleCreate();
              }
            }}
            disabled={isSubmittingNew || disabled}
            className="devflow-subtask-add-input"
            aria-label="New subtask title"
          />
          <Button
            type="button"
            className="devflow-btn-primary h-8 px-3 text-xs shrink-0"
            disabled={!newTitle.trim() || isSubmittingNew || disabled}
            onClick={handleCreate}
          >
            <Plus className="size-3.5 mr-1" />
            <span>{isSubmittingNew ? "Adding..." : "Add"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
