import { Bookmark, BookmarkCheck, Calendar, FolderKanban, ListTodo } from "lucide-react";
import type { KnowledgeNote } from "../types";

export interface NoteCardProps {
  note: KnowledgeNote;
  projectName?: string | null;
  projectColor?: string | null;
  taskTitle?: string | null;
  onSelect: (note: KnowledgeNote) => void;
  onTogglePin?: (noteId: string, isPinned: boolean) => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NoteCard({
  note,
  projectName,
  projectColor,
  taskTitle,
  onSelect,
  onTogglePin,
}: NoteCardProps) {
  const categoryClass = `is-${(note.category || "other").toLowerCase()}`;

  const handleCardClick = () => {
    onSelect(note);
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin?.(note.id, !note.is_pinned);
  };

  return (
    <div
      className={`devflow-note-card ${note.is_pinned ? "is-pinned" : ""}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`Open note: ${note.title}`}
    >
      {/* Top Header Row */}
      <div className="devflow-note-card-header">
        <div className="devflow-note-card-badges">
          <span className={`devflow-category-badge ${categoryClass}`}>
            {note.category || "Bugfix"}
          </span>

          {note.is_pinned && (
            <span className="devflow-pin-badge" title="Pinned to top">
              <BookmarkCheck className="size-3.5" />
            </span>
          )}
        </div>

        {onTogglePin && (
          <button
            type="button"
            className="text-muted-foreground hover:text-accent p-1 transition-colors cursor-pointer"
            onClick={handlePinClick}
            aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
            title={note.is_pinned ? "Unpin note" : "Pin note to top"}
          >
            {note.is_pinned ? (
              <BookmarkCheck className="size-4 text-accent" />
            ) : (
              <Bookmark className="size-4 opacity-50 hover:opacity-100" />
            )}
          </button>
        )}
      </div>

      {/* Note Title */}
      <h3 className="devflow-note-card-title">{note.title}</h3>

      {/* Summary */}
      {note.summary ? (
        <p className="devflow-note-card-summary">{note.summary}</p>
      ) : note.problem ? (
        <div className="devflow-note-card-snippet">
          <strong>Problem: </strong>
          <span>{note.problem}</span>
        </div>
      ) : note.solution ? (
        <div className="devflow-note-card-snippet">
          <strong>Solution: </strong>
          <span>{note.solution}</span>
        </div>
      ) : null}

      {/* Context info (Project / Task) */}
      {(projectName || taskTitle) && (
        <div className="devflow-note-context-row">
          {projectName && (
            <span className="devflow-note-project-pill" title={`Project: ${projectName}`}>
              <FolderKanban
                className="size-3 shrink-0"
                style={{ color: projectColor || "#a855f7" }}
              />
              <span className="truncate">{projectName}</span>
            </span>
          )}
          {taskTitle && (
            <span className="devflow-note-task-pill" title={`Task: ${taskTitle}`}>
              <ListTodo className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{taskTitle}</span>
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {note.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="devflow-note-tag">
              #{tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-[11px] text-muted-foreground font-medium">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="devflow-note-card-footer">
        <div className="flex items-center gap-1">
          <Calendar className="size-3 opacity-60" />
          <span>Updated {formatDate(note.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
