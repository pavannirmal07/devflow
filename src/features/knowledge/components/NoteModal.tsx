import { useState, useMemo } from "react";
import {
  X,
  AlertCircle,
  Bookmark,
  Search,
  AlertOctagon,
  Target,
  Wrench,
  Lightbulb,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KNOWLEDGE_CATEGORIES, type CreateKnowledgeNoteInput, type KnowledgeCategory, type KnowledgeNote, type UpdateKnowledgeNoteInput } from "../types";
import type { DevProject } from "@/features/projects";
import type { DevTask } from "@/features/tasks";

export interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: KnowledgeNote | null;
  projects: DevProject[];
  tasks: DevTask[];
  initialProjectId?: string | null;
  initialTaskId?: string | null;
  initialTitle?: string;
  initialCategory?: KnowledgeCategory;
  onSubmit: (
    input: CreateKnowledgeNoteInput | UpdateKnowledgeNoteInput
  ) => Promise<{ note: KnowledgeNote | null; error: Error | null }>;
}

export function NoteModal({
  isOpen,
  onClose,
  note,
  projects,
  tasks,
  initialProjectId,
  initialTaskId,
  initialTitle,
  initialCategory,
  onSubmit,
}: NoteModalProps) {
  if (!isOpen) return null;

  return (
    <NoteModalForm
      key={note?.id || "new-note"}
      note={note}
      projects={projects}
      tasks={tasks}
      initialProjectId={initialProjectId}
      initialTaskId={initialTaskId}
      initialTitle={initialTitle}
      initialCategory={initialCategory}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface NoteModalFormProps {
  note?: KnowledgeNote | null;
  projects: DevProject[];
  tasks: DevTask[];
  initialProjectId?: string | null;
  initialTaskId?: string | null;
  initialTitle?: string;
  initialCategory?: KnowledgeCategory;
  onClose: () => void;
  onSubmit: (
    input: CreateKnowledgeNoteInput | UpdateKnowledgeNoteInput
  ) => Promise<{ note: KnowledgeNote | null; error: Error | null }>;
}

function NoteModalForm({
  note,
  projects,
  tasks,
  initialProjectId,
  initialTaskId,
  initialTitle,
  initialCategory,
  onClose,
  onSubmit,
}: NoteModalFormProps) {
  const isEditing = Boolean(note);

  const [title, setTitle] = useState(note?.title || initialTitle || "");
  const [summary, setSummary] = useState(note?.summary || "");
  const [problem, setProblem] = useState(note?.problem || "");
  const [investigation, setInvestigation] = useState(note?.investigation || "");
  const [rootCause, setRootCause] = useState(note?.root_cause || "");
  const [solution, setSolution] = useState(note?.solution || "");
  const [lessonsLearned, setLessonsLearned] = useState(note?.lessons_learned || "");
  const [content, setContent] = useState(note?.content || "");
  const [category, setCategory] = useState<KnowledgeCategory>(
    note?.category || initialCategory || "Bugfix"
  );
  const [projectId, setProjectId] = useState<string>(
    note?.project_id || initialProjectId || ""
  );
  const [taskId, setTaskId] = useState<string>(
    note?.task_id || initialTaskId || ""
  );
  const [tagsInput, setTagsInput] = useState<string>(
    note?.tags ? note.tags.join(", ") : ""
  );
  const [isPinned, setIsPinned] = useState<boolean>(note?.is_pinned || false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If a project is selected, scope available tasks to that project
  const availableTasks = useMemo(() => {
    if (!projectId) return tasks;
    return tasks.filter((t) => !t.project_id || t.project_id === projectId);
  }, [tasks, projectId]);

  // When task is selected, optionally auto-select its project if not already set
  const handleTaskChange = (newTaskId: string) => {
    setTaskId(newTaskId);
    if (newTaskId && !projectId) {
      const selectedTask = tasks.find((t) => t.id === newTaskId);
      if (selectedTask?.project_id) {
        setProjectId(selectedTask.project_id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const payload: CreateKnowledgeNoteInput = {
      title: trimmedTitle,
      summary: summary.trim() || null,
      problem: problem.trim() || null,
      investigation: investigation.trim() || null,
      root_cause: rootCause.trim() || null,
      solution: solution.trim() || null,
      lessons_learned: lessonsLearned.trim() || null,
      content: content.trim() || null,
      category,
      project_id: projectId || null,
      task_id: taskId || null,
      tags: parsedTags,
      is_pinned: isPinned,
    };

    const { note: savedNote, error } = await onSubmit(payload);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (savedNote) {
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
      className="devflow-note-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
    >
      <div className="devflow-note-modal-card">
        <div className="devflow-note-modal-header">
          <h2 id="note-modal-title" className="devflow-note-modal-title">
            {isEditing ? "Edit Technical Note" : "New Technical Note"}
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
          <div className="devflow-task-alert is-error m-4 mb-0" role="alert">
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

        <form onSubmit={handleSubmit} className="devflow-note-modal-form">
          <div className="devflow-note-modal-fields">
            {/* Title (Required) */}
            <div className="devflow-field-group">
              <Label htmlFor="note-title-input" className="devflow-field-label">
                Note Title <span className="text-destructive">*</span>
              </Label>
              <input
                id="note-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
                placeholder="e.g. Command Palette — Stale Active Session State"
                className="devflow-note-input font-medium"
              />
            </div>

            {/* Category & Pin row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="devflow-field-group">
                <Label htmlFor="note-category" className="devflow-field-label">
                  Category
                </Label>
                <select
                  id="note-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                  disabled={isSubmitting}
                  className="devflow-note-select"
                >
                  {KNOWLEDGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="devflow-field-group flex flex-col justify-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none pb-2">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    disabled={isSubmitting}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <Bookmark className="size-3.5 text-accent" />
                  <span>Pin note to top of Knowledge</span>
                </label>
              </div>
            </div>

            {/* Summary */}
            <div className="devflow-field-group">
              <Label htmlFor="note-summary" className="devflow-field-label">
                Summary (optional)
              </Label>
              <textarea
                id="note-summary"
                rows={2}
                placeholder="High-level overview of the issue or takeaway..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={isSubmitting}
                className="devflow-note-textarea"
              />
            </div>

            {/* Structured Engineering Journal Sections */}
            <div className="pt-2 border-t border-border flex flex-col gap-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Engineering Journal Lifecycle
              </div>

              {/* 1. Problem */}
              <div className="devflow-field-group">
                <Label htmlFor="note-problem" className="devflow-field-label flex items-center gap-1.5">
                  <AlertOctagon className="size-3.5 text-muted-foreground" />
                  <span>Problem (What happened?)</span>
                </Label>
                <textarea
                  id="note-problem"
                  rows={3}
                  placeholder="Describe the unexpected behavior, bug, or symptom..."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-note-textarea"
                />
              </div>

              {/* 2. Investigation */}
              <div className="devflow-field-group">
                <Label htmlFor="note-investigation" className="devflow-field-label flex items-center gap-1.5">
                  <Search className="size-3.5 text-muted-foreground" />
                  <span>Investigation (What was checked / tested?)</span>
                </Label>
                <textarea
                  id="note-investigation"
                  rows={2}
                  placeholder="Steps taken to inspect, reproduce, or debug..."
                  value={investigation}
                  onChange={(e) => setInvestigation(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-note-textarea"
                />
              </div>

              {/* 3. Root Cause */}
              <div className="devflow-field-group">
                <Label htmlFor="note-root-cause" className="devflow-field-label flex items-center gap-1.5">
                  <Target className="size-3.5 text-muted-foreground" />
                  <span>Root Cause (Why did it happen?)</span>
                </Label>
                <textarea
                  id="note-root-cause"
                  rows={3}
                  placeholder="Underlying flaw, race condition, stale state, or design gap..."
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-note-textarea"
                />
              </div>

              {/* 4. Solution */}
              <div className="devflow-field-group">
                <Label htmlFor="note-solution" className="devflow-field-label flex items-center gap-1.5">
                  <Wrench className="size-3.5 text-muted-foreground" />
                  <span>Solution (What was changed?)</span>
                </Label>
                <textarea
                  id="note-solution"
                  rows={3}
                  placeholder="The architectural or code fix implemented to resolve the problem..."
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-note-textarea"
                />
              </div>

              {/* 5. Lessons Learned */}
              <div className="devflow-field-group">
                <Label htmlFor="note-lessons" className="devflow-field-label flex items-center gap-1.5">
                  <Lightbulb className="size-3.5 text-muted-foreground" />
                  <span>Lessons Learned (What should be remembered?)</span>
                </Label>
                <textarea
                  id="note-lessons"
                  rows={3}
                  placeholder="Key principle, prevention pattern, or architectural heuristic..."
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-note-textarea"
                />
              </div>

              {/* 6. Additional Notes & Code */}
              <div className="devflow-field-group">
                <Label htmlFor="note-content" className="devflow-field-label flex items-center gap-1.5">
                  <Code2 className="size-3.5 text-muted-foreground" />
                  <span>Additional Notes & Code Snippets (optional)</span>
                </Label>
                <textarea
                  id="note-content"
                  rows={3}
                  placeholder="Code diff, error logs, config snippets, or documentation..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-note-textarea is-code"
                />
              </div>
            </div>

            {/* Context & Metadata: Project, Task, Tags */}
            <div className="pt-2 border-t border-border flex flex-col gap-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Related Context & Tags
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project */}
                <div className="devflow-field-group">
                  <Label htmlFor="note-project" className="devflow-field-label">
                    Related Project (optional)
                  </Label>
                  <select
                    id="note-project"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    disabled={isSubmitting}
                    className="devflow-note-select"
                  >
                    <option value="">No Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task */}
                <div className="devflow-field-group">
                  <Label htmlFor="note-task" className="devflow-field-label">
                    Related Task (optional)
                  </Label>
                  <select
                    id="note-task"
                    value={taskId}
                    onChange={(e) => handleTaskChange(e.target.value)}
                    disabled={isSubmitting}
                    className="devflow-note-select"
                  >
                    <option value="">No Task</option>
                    {availableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="devflow-field-group">
                <Label htmlFor="note-tags" className="devflow-field-label">
                  Tags (comma separated)
                </Label>
                <input
                  id="note-tags"
                  type="text"
                  placeholder="e.g. react, supabase, rls, state-management"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  disabled={isSubmitting}
                  className="devflow-note-input"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="devflow-note-modal-actions">
            <Button
              type="button"
              className="devflow-btn-secondary h-9 px-4 text-xs"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="devflow-btn-primary h-9 px-4 text-xs"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Note"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
