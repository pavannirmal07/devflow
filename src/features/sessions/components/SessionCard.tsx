import { useState } from "react";
import { Clock, Calendar, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DevSession } from "../types";

interface SessionCardProps {
  session: DevSession;
  onDelete: (sessionId: string) => Promise<void>;
  isDeleting?: boolean;
}

function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || seconds < 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionCard({
  session,
  onDelete,
  isDeleting = false,
}: SessionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    await onDelete(session.id);
    setConfirmDelete(false);
  };

  return (
    <div className="devflow-session-card">
      <div className="devflow-session-card-main">
        <div className="devflow-session-card-header">
          <div className="devflow-session-card-title-group">
            <span className="devflow-session-status-badge is-completed">
              <CheckCircle2 className="size-3.5" />
              <span>Completed</span>
            </span>
            <h3 className="devflow-session-card-title">{session.title}</h3>
          </div>
          <span className="devflow-session-duration-pill">
            <Clock className="size-3.5" />
            <span>{formatDuration(session.duration_seconds)}</span>
          </span>
        </div>

        {session.description && (
          <p className="devflow-session-card-desc">{session.description}</p>
        )}

        <div className="devflow-session-card-meta">
          <div className="devflow-session-meta-item">
            <Calendar className="size-3.5" />
            <span>Started: {formatDateTime(session.started_at)}</span>
          </div>
          {session.ended_at && (
            <div className="devflow-session-meta-item">
              <Calendar className="size-3.5" />
              <span>Ended: {formatDateTime(session.ended_at)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="devflow-session-card-actions">
        {confirmDelete ? (
          <div className="devflow-session-delete-confirm">
            <span className="text-xs text-destructive">Delete?</span>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "..." : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="devflow-session-delete-btn text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete session"
            title="Delete session"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
