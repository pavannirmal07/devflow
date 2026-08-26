import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Bookmark,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKnowledge } from "../useKnowledge";
import { useProjects } from "@/features/projects";
import { useTasks } from "@/features/tasks";
import { NoteCard } from "../components/NoteCard";
import { NoteDetail } from "../components/NoteDetail";
import { NoteModal } from "../components/NoteModal";
import {
  KNOWLEDGE_CATEGORIES,
  type CreateKnowledgeNoteInput,
  type KnowledgeFilterCategory,
  type KnowledgeNote,
  type UpdateKnowledgeNoteInput,
} from "../types";
import "../knowledge.css";

export interface KnowledgePageProps {
  userId: string;
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string | null) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToTask?: (taskId: string, projectId?: string | null) => void;
}

export function KnowledgePage({
  userId,
  selectedNoteId: propSelectedNoteId,
  onSelectNote,
  onNavigateToProject,
  onNavigateToTask,
}: KnowledgePageProps) {
  const {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    refreshNotes,
  } = useKnowledge(userId);

  const { projects } = useProjects(userId);
  const { tasks } = useTasks(userId);

  const [internalSelectedNoteId, setInternalSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeFilterCategory>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<KnowledgeNote | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeSelectedNoteId =
    propSelectedNoteId !== undefined ? propSelectedNoteId : internalSelectedNoteId;

  // Selected note for detail view
  const currentNote = activeSelectedNoteId
    ? notes.find((n) => n.id === activeSelectedNoteId) || null
    : null;

  // Project map for quick lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    for (const p of projects) {
      map.set(p.id, { name: p.name, color: p.color });
    }
    return map;
  }, [projects]);

  // Task map for quick lookup
  const taskMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      map.set(t.id, t.title);
    }
    return map;
  }, [tasks]);

  // Category counts calculation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notes.length };
    for (const cat of KNOWLEDGE_CATEGORIES) {
      counts[cat] = 0;
    }
    for (const n of notes) {
      if (n.category && counts[n.category] !== undefined) {
        counts[n.category] += 1;
      }
    }
    return counts;
  }, [notes]);

  // Filtered notes based on multi-field substring search, category, and project
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return notes.filter((n) => {
      // Category filter
      if (categoryFilter !== "all" && n.category !== categoryFilter) {
        return false;
      }

      // Project filter
      if (projectFilter !== "all") {
        if (projectFilter === "none") {
          if (n.project_id) return false;
        } else if (n.project_id !== projectFilter) {
          return false;
        }
      }

      // Search query across all structured fields & tags
      if (q) {
        const titleMatch = n.title.toLowerCase().includes(q);
        const summaryMatch = n.summary?.toLowerCase().includes(q) || false;
        const problemMatch = n.problem?.toLowerCase().includes(q) || false;
        const investigationMatch = n.investigation?.toLowerCase().includes(q) || false;
        const rootCauseMatch = n.root_cause?.toLowerCase().includes(q) || false;
        const solutionMatch = n.solution?.toLowerCase().includes(q) || false;
        const lessonsMatch = n.lessons_learned?.toLowerCase().includes(q) || false;
        const contentMatch = n.content?.toLowerCase().includes(q) || false;
        const categoryMatch = n.category?.toLowerCase().includes(q) || false;
        const tagMatch = n.tags?.some((t) => t.toLowerCase().includes(q)) || false;

        const proj = n.project_id ? projectMap.get(n.project_id) : null;
        const projectMatch = proj?.name.toLowerCase().includes(q) || false;

        const taskTitle = n.task_id ? taskMap.get(n.task_id) : null;
        const taskMatch = taskTitle?.toLowerCase().includes(q) || false;

        if (
          !titleMatch &&
          !summaryMatch &&
          !problemMatch &&
          !investigationMatch &&
          !rootCauseMatch &&
          !solutionMatch &&
          !lessonsMatch &&
          !contentMatch &&
          !categoryMatch &&
          !tagMatch &&
          !projectMatch &&
          !taskMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [notes, searchQuery, categoryFilter, projectFilter, projectMap, taskMap]);

  // Separate pinned vs unpinned notes
  const pinnedNotes = useMemo(() => {
    return filteredNotes.filter((n) => n.is_pinned);
  }, [filteredNotes]);

  const regularNotes = useMemo(() => {
    return filteredNotes.filter((n) => !n.is_pinned);
  }, [filteredNotes]);

  const handleSelectNote = (note: KnowledgeNote) => {
    setInternalSelectedNoteId(note.id);
    onSelectNote?.(note.id);
  };

  const handleBackToKnowledge = () => {
    setInternalSelectedNoteId(null);
    onSelectNote?.(null);
  };

  const handleCreateSubmit = async (
    input: CreateKnowledgeNoteInput | UpdateKnowledgeNoteInput
  ) => {
    setActionError(null);
    const res = await createNote(input as CreateKnowledgeNoteInput);
    if (res.error) {
      setActionError(res.error.message);
    }
    return res;
  };

  const handleEditSubmit = async (
    input: CreateKnowledgeNoteInput | UpdateKnowledgeNoteInput
  ) => {
    if (!editingNote) return { note: null, error: new Error("No note selected for editing") };
    setActionError(null);
    const res = await updateNote(editingNote.id, input as UpdateKnowledgeNoteInput);
    if (res.error) {
      setActionError(res.error.message);
    } else {
      setEditingNote(null);
    }
    return res;
  };

  const handleDeleteNote = async (noteId: string) => {
    setActionError(null);
    const { error: delError } = await deleteNote(noteId);
    if (delError) {
      setActionError(delError.message);
    } else if (activeSelectedNoteId === noteId) {
      handleBackToKnowledge();
    }
  };

  // If a note is selected, render the dedicated NoteDetail view
  if (currentNote) {
    return (
      <div className="devflow-knowledge-page">
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
                void refreshNotes();
              }}
            >
              <RefreshCw className="size-3 mr-1" />
              <span>Try Again</span>
            </Button>
          </div>
        )}

        <NoteDetail
          note={currentNote}
          projects={projects}
          tasks={tasks}
          onBack={handleBackToKnowledge}
          onEdit={(n) => setEditingNote(n)}
          onDelete={handleDeleteNote}
          onTogglePin={(id, isPinned) => void togglePinNote(id, isPinned)}
          onNavigateToProject={onNavigateToProject}
          onNavigateToTask={onNavigateToTask}
        />

        {/* Edit Note Modal */}
        <NoteModal
          isOpen={Boolean(editingNote)}
          onClose={() => setEditingNote(null)}
          note={editingNote}
          projects={projects}
          tasks={tasks}
          onSubmit={handleEditSubmit}
        />
      </div>
    );
  }

  return (
    <div className="devflow-knowledge-page">
      {/* Top Header */}
      <div className="devflow-knowledge-header">
        <div className="devflow-knowledge-title-group">
          <h1>Knowledge</h1>
          <p className="devflow-knowledge-subtitle">
            Technical notes, solutions, and engineering lessons.
          </p>
        </div>

        <div className="devflow-knowledge-header-actions">
          <Button
            type="button"
            className="devflow-btn-primary h-9 px-4 text-xs gap-1.5"
            onClick={() => setIsCreateOpen(true)}
            aria-label="Create new technical note"
          >
            <Plus className="size-4" />
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {/* Error Alert if any */}
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
              void refreshNotes();
            }}
          >
            <RefreshCw className="size-3 mr-1" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="devflow-knowledge-controls">
        <div className="devflow-knowledge-search-row">
          <div className="devflow-knowledge-search-box">
            <Search className="devflow-knowledge-search-icon size-4" />
            <input
              type="text"
              placeholder="Search notes by problem, root cause, solution, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="devflow-knowledge-search-input"
              aria-label="Search technical notes"
            />
            {searchQuery && (
              <button
                type="button"
                className="devflow-knowledge-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="devflow-knowledge-project-select"
            aria-label="Filter notes by project"
          >
            <option value="all">All Projects ({notes.length})</option>
            <option value="none">No Project Linked</option>
            {projects.map((p) => {
              const count = notes.filter((n) => n.project_id === p.id).length;
              return (
                <option key={p.id} value={p.id}>
                  {p.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Category Filter Bar */}
        <div className="devflow-knowledge-category-bar" role="tablist" aria-label="Category filters">
          <button
            type="button"
            role="tab"
            aria-selected={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
            className={`devflow-knowledge-category-pill ${
              categoryFilter === "all" ? "is-active" : ""
            }`}
          >
            <span>All Categories</span>
            <span className="devflow-knowledge-category-count">
              {categoryCounts.all || 0}
            </span>
          </button>

          {KNOWLEDGE_CATEGORIES.map((cat) => {
            const isActive = categoryFilter === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setCategoryFilter(cat)}
                className={`devflow-knowledge-category-pill ${
                  isActive ? "is-active" : ""
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span className="devflow-knowledge-category-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="devflow-knowledge-empty py-16">
          <RefreshCw className="size-6 text-accent animate-spin" />
          <p className="text-sm font-medium text-foreground mt-2">
            Loading technical notes...
          </p>
        </div>
      ) : notes.length === 0 ? (
        /* Empty State: No Notes Ever */
        <div className="devflow-knowledge-empty">
          <BookOpen className="devflow-knowledge-empty-icon" />
          <h2 className="devflow-knowledge-empty-title">No technical notes yet.</h2>
          <p className="devflow-knowledge-empty-desc">
            Capture solutions, debugging discoveries, and engineering lessons as you build.
          </p>
          <Button
            type="button"
            className="devflow-btn-primary mt-2 gap-1.5 h-9 px-4 text-xs"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-4" />
            <span>Create Technical Note</span>
          </Button>
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Empty State: No search results */
        <div className="devflow-knowledge-empty">
          <Search className="devflow-knowledge-empty-icon" />
          <h2 className="devflow-knowledge-empty-title">No technical notes found.</h2>
          <p className="devflow-knowledge-empty-desc">
            No notes match "{searchQuery || categoryFilter}". Try adjusting your search query or filters.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 text-xs"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setProjectFilter("all");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="devflow-knowledge-section-title">
                <Bookmark className="size-3.5 text-accent" />
                <span>Pinned Notes</span>
                <span className="devflow-knowledge-section-count">
                  {pinnedNotes.length}
                </span>
              </div>
              <div className="devflow-knowledge-grid">
                {pinnedNotes.map((note) => {
                  const proj = note.project_id ? projectMap.get(note.project_id) : null;
                  const taskTitle = note.task_id ? taskMap.get(note.task_id) : null;
                  return (
                    <NoteCard
                      key={note.id}
                      note={note}
                      projectName={proj?.name}
                      projectColor={proj?.color}
                      taskTitle={taskTitle}
                      onSelect={handleSelectNote}
                      onTogglePin={(id, isPinned) => void togglePinNote(id, isPinned)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* All Notes Section */}
          <div>
            {pinnedNotes.length > 0 && (
              <div className="devflow-knowledge-section-title">
                <BookOpen className="size-3.5 text-muted-foreground" />
                <span>All Notes</span>
                <span className="devflow-knowledge-section-count">
                  {regularNotes.length}
                </span>
              </div>
            )}
            <div className="devflow-knowledge-grid">
              {(pinnedNotes.length > 0 ? regularNotes : filteredNotes).map((note) => {
                const proj = note.project_id ? projectMap.get(note.project_id) : null;
                const taskTitle = note.task_id ? taskMap.get(note.task_id) : null;
                return (
                  <NoteCard
                    key={note.id}
                    note={note}
                    projectName={proj?.name}
                    projectColor={proj?.color}
                    taskTitle={taskTitle}
                    onSelect={handleSelectNote}
                    onTogglePin={(id, isPinned) => void togglePinNote(id, isPinned)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      <NoteModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projects={projects}
        tasks={tasks}
        onSubmit={handleCreateSubmit}
      />

      {/* Edit Note Modal */}
      <NoteModal
        isOpen={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
        note={editingNote}
        projects={projects}
        tasks={tasks}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
