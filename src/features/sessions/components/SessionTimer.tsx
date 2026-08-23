import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SessionTimerProps {
  startedAt: string;
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

export function SessionTimer({ startedAt, className }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Date.now() - new Date(startedAt).getTime())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - new Date(startedAt).getTime()));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className={cn("font-mono font-semibold tracking-wider", className)}>
      {formatElapsed(elapsed)}
    </span>
  );
}
