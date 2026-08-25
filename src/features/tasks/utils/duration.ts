import type { SessionStatus } from "../../sessions/types";

/**
 * Formats a duration in seconds into a compact, human-readable string.
 *
 * Expected formatting:
 * - 0 or negative -> "0m"
 * - < 60 sec -> "30s"
 * - 60+ sec -> "45m"
 * - 3600+ sec -> "1h 15m" (or "1h" if remaining minutes is 0)
 */
export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined || seconds <= 0) {
    return "0m";
  }

  const rounded = Math.floor(seconds);
  if (rounded < 60) {
    return `${rounded}s`;
  }

  const totalMinutes = Math.floor(rounded / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Computes the effective elapsed duration in seconds for a single session.
 * - Completed session: uses `duration_seconds` (or accumulated_seconds as fallback)
 * - Paused session: uses `accumulated_seconds`
 * - Active session: uses `accumulated_seconds` + live elapsed seconds since `last_resumed_at` (or `started_at`)
 */
export function computeSessionDuration(session: {
  status: SessionStatus;
  duration_seconds?: number | null;
  accumulated_seconds?: number | null;
  last_resumed_at?: string | null;
  started_at?: string;
}): number {
  if (session.status === "completed") {
    return Math.max(0, session.duration_seconds ?? session.accumulated_seconds ?? 0);
  }

  const accumulated = Math.max(0, session.accumulated_seconds ?? 0);
  if (session.status === "paused") {
    return accumulated;
  }

  // Active session
  const anchor = session.last_resumed_at || session.started_at;
  if (!anchor) {
    return accumulated;
  }

  const currentSegment = Math.max(
    0,
    Math.floor((Date.now() - new Date(anchor).getTime()) / 1000)
  );

  return accumulated + currentSegment;
}
