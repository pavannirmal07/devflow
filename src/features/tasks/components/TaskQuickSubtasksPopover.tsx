import { useRef, useState } from "react";
import { Check, CheckSquare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubtasks } from "../useSubtasks";
import type { TaskSubtask } from "../types";

export interface TaskQuickSubtasksPopoverProps {
  taskId: string;
  subtasks: TaskSubtask[];
  onSubtasksChange?: (subtasks: TaskSubtask[]) => void;
  onClose: () => void;
  onOpenEditModal?: () => void;
}

export function TaskQuickSubtasksPopover({
  taskId,
  subtasks: initialSubtasks,
  onSubtasksChange,
  onClose,
  onOpenEditModal,
}: TaskQuickSubtasksPopoverProps) {
  const addInputRef = useRef<HTMLInputElement>(null);

  const {
    subtasks,
    toggleSubtask,
    createSubtask,
  } = useSubtasks(taskId, {
    initialSubtasks,
    onSubtasksChange,
  });

  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [popoverError, setPopoverError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setPopoverError("Enter a title");
      addInputRef.current?.focus();
      return;
    }
    if (isAdding) return;

    setPopoverError(null);
    setIsAdding(true);
    const { error } = await createSubtask(trimmed);
    setIsAdding(false);

    if (error) {
      setPopoverError(error.message);
    } else {
      setNewTitle("");
      setTimeout(() => addInputRef.current?.focus(), 50);
    }
  };

  return (
    <div
      className="devflow-quick-subtasks-inner"
      role="region"
      aria-label="Quick Subtasks View"
    >
      {/* Header — clean 'Subtasks' title without redundant counter or progress bar */}
      <div className="devflow-quick-subtasks-header">
        <div className="flex items-center gap-1.5 min-w-0">
          <CheckSquare className="size-4 text-accent shrink-0" />
          <span className="font-semibold text-xs text-foreground truncate">Subtasks</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close subtasks quick view"
          className="size-6 rounded-md hover:bg-muted"
        >
          <X className="size-3.5 text-muted-foreground" />
        </Button>
      </div>

      {popoverError && (
        <p className="text-[11px] text-destructive font-medium px-1">{popoverError}</p>
      )}

      {/* Checklist items */}
      <div className="devflow-quick-subtasks-list" role="list">
        {subtasks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2.5 text-center">No subtasks yet</p>
        ) : (
          subtasks.map((subtask) => (
            <div
              key={subtask.id}
              role="listitem"
              className={`devflow-quick-subtask-item ${
                subtask.completed ? "is-completed" : ""
              }`}
            >
              <label className="devflow-subtask-checkbox-label w-full cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={(e) => toggleSubtask(subtask.id, e.target.checked)}
                  className="devflow-subtask-checkbox-input sr-only"
                  aria-label={`Mark "${subtask.title}" as ${
                    subtask.completed ? "incomplete" : "complete"
                  }`}
                />
                <span
                  className={`devflow-subtask-checkbox-custom shrink-0 ${
                    subtask.completed ? "is-checked" : ""
                  }`}
                  aria-hidden="true"
                >
                  {subtask.completed && <Check className="size-3 text-white" />}
                </span>
                <span className="devflow-subtask-text text-xs leading-snug">
                  {subtask.title}
                </span>
              </label>
            </div>
          ))
        )}
      </div>

      {/* Quick Add Subtask Input */}
      <div className="devflow-quick-subtasks-add-form">
        <input
          ref={addInputRef}
          type="text"
          placeholder="Add a subtask..."
          value={newTitle}
          onChange={(e) => {
            setNewTitle(e.target.value);
            if (popoverError) setPopoverError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleCreate();
            }
          }}
          disabled={isAdding}
          className="devflow-quick-subtasks-add-input"
          aria-label="Add subtask title"
        />
        <Button
          type="button"
          className="devflow-btn-primary h-7 px-2.5 text-xs shrink-0"
          disabled={!newTitle.trim() || isAdding}
          onClick={handleCreate}
        >
          <Plus className="size-3 mr-0.5" />
          <span>{isAdding ? "..." : "Add"}</span>
        </Button>
      </div>

      {/* Footer link to full modal */}
      {onOpenEditModal && (
        <div className="devflow-quick-subtasks-footer">
          <button
            type="button"
            className="devflow-quick-subtasks-manage-btn"
            onClick={onOpenEditModal}
          >
            <span>Edit all subtasks</span>
            <span className="ml-1 opacity-70">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
