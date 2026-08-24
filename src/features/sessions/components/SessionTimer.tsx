import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "../types";

interface SessionTimerProps {
  status: SessionStatus;
  accumulatedSeconds?: number | null;
  lastResumedAt?: string | null;
  startedAt?: string;
  className?: string;
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function computeElapsedMs(
  status: SessionStatus,
  accumulatedSeconds?: number | null,
  lastResumedAt?: string | null,
  startedAt?: string
): number {
  const accumulatedMs = Math.max(0, (accumulatedSeconds || 0) * 1000);
  if (status === "paused") {
    return accumulatedMs;
  }
  const resumeAnchor = lastResumedAt || startedAt;
  if (!resumeAnchor) {
    return accumulatedMs;
  }
  const currentSegmentMs = Math.max(0, Date.now() - new Date(resumeAnchor).getTime());
  return accumulatedMs + currentSegmentMs;
}

export function SessionTimer({
  status,
  accumulatedSeconds = 0,
  lastResumedAt,
  startedAt,
  className,
}: SessionTimerProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status === "paused") {
      return;
    }

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, lastResumedAt]);

  const elapsed = computeElapsedMs(status, accumulatedSeconds, lastResumedAt, startedAt);

  return (
    <span className={cn("font-mono font-semibold tracking-wider", className)}>
      {formatElapsed(elapsed)}
    </span>
  );
}
