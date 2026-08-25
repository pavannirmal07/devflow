import type { DevTask } from "../../tasks/types";
import type { DevSession } from "../../sessions/types";
import { computeSessionDuration } from "../../tasks/utils/duration";

export interface ProjectRecentSessionItem {
  id: string;
  title: string;
  taskTitle: string | null;
  durationSeconds: number;
  status: "active" | "paused" | "completed";
  startedAt: string;
}

export interface ProjectMetrics {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalFocusSeconds: number;
  recentSessions: ProjectRecentSessionItem[];
}

export function deriveProjectMetrics(
  projectId: string,
  tasks: DevTask[],
  sessions: DevSession[],
  activeSession?: DevSession | null
): ProjectMetrics {
  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  const taskMap = new Map<string, DevTask>();
  const projectTaskIdSet = new Set<string>();

  for (const t of projectTasks) {
    taskMap.set(t.id, t);
    projectTaskIdSet.add(t.id);
  }

  let todoTasks = 0;
  let inProgressTasks = 0;
  let completedTasks = 0;

  for (const t of projectTasks) {
    if (t.status === "todo") todoTasks++;
    else if (t.status === "in_progress") inProgressTasks++;
    else if (t.status === "completed") completedTasks++;
  }

  // Filter sessions that belong to this project
  const projectSessions = sessions.filter(
    (s) => s.task_id && projectTaskIdSet.has(s.task_id)
  );

  let totalFocusSeconds = 0;
  const countedSessionIds = new Set<string>();

  for (const s of projectSessions) {
    countedSessionIds.add(s.id);
    totalFocusSeconds += computeSessionDuration(s);
  }

  // Include activeSession if it belongs to a task in this project and not already counted
  if (
    activeSession &&
    activeSession.task_id &&
    projectTaskIdSet.has(activeSession.task_id) &&
    !countedSessionIds.has(activeSession.id)
  ) {
    totalFocusSeconds += computeSessionDuration(activeSession);
  }

  // Build list of recent sessions
  const allProjectSessionsList: ProjectRecentSessionItem[] = [];

  // Add live active session first if belongs to project
  if (
    activeSession &&
    activeSession.task_id &&
    projectTaskIdSet.has(activeSession.task_id)
  ) {
    allProjectSessionsList.push({
      id: activeSession.id,
      title: activeSession.title,
      taskTitle: taskMap.get(activeSession.task_id)?.title || null,
      durationSeconds: computeSessionDuration(activeSession),
      status: activeSession.status,
      startedAt: activeSession.started_at,
    });
  }

  for (const s of projectSessions) {
    if (activeSession && activeSession.id === s.id) continue;
    allProjectSessionsList.push({
      id: s.id,
      title: s.title,
      taskTitle: s.task_id ? taskMap.get(s.task_id)?.title || null : null,
      durationSeconds: computeSessionDuration(s),
      status: s.status,
      startedAt: s.started_at,
    });
  }

  // Sort by startedAt descending
  allProjectSessionsList.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return {
    totalTasks: projectTasks.length,
    todoTasks,
    inProgressTasks,
    completedTasks,
    totalFocusSeconds,
    recentSessions: allProjectSessionsList.slice(0, 5),
  };
}
