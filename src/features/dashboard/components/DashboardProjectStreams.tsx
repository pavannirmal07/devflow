import { FolderKanban, GitBranch, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "../../github/components/GitHubIcon";
import type { DevProject } from "../../projects/types";
import { formatProjectName } from "../../projects/utils/formatProjectName";
import type { DevTask } from "../../tasks/types";

export interface DashboardProjectStreamsProps {
  projects: DevProject[];
  tasks: DevTask[];
  onNavigateToProjects: () => void;
  onNavigateToProjectWorkspace: (projectId: string) => void;
  onCreateProject: () => void;
}

export function DashboardProjectStreams({
  projects,
  tasks,
  onNavigateToProjects,
  onNavigateToProjectWorkspace,
  onCreateProject,
}: DashboardProjectStreamsProps) {
  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="devflow-dashboard-card devflow-dashboard-projects-card">
      <div className="devflow-dashboard-card-header devflow-dashboard-projects-header">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <FolderKanban className="size-4 text-accent shrink-0" />
          <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">
            Active Project Streams
          </h3>
          {activeProjects.length > 0 && (
            <span className="devflow-dashboard-count-badge shrink-0">
              {activeProjects.length}
            </span>
          )}
        </div>

        <div className="devflow-dashboard-projects-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCreateProject}
            className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
          >
            <Plus className="size-3" />
            <span>New Project</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onNavigateToProjects}
            className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
          >
            <span>All Projects</span>
            <ExternalLink className="size-3" />
          </Button>
        </div>
      </div>

      {activeProjects.length === 0 ? (
        <div className="devflow-dashboard-projects-empty">
          <FolderKanban className="size-5 text-muted-foreground opacity-60" />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-foreground">
              No active projects yet.
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Create a project to organize tasks and connect GitHub repositories.
            </p>
          </div>
        </div>
      ) : (
        <div className="devflow-dashboard-projects-grid">
          {activeProjects.map((project) => {
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const openTasks = projectTasks.filter((t) => t.status !== "completed");
            const hasGitHub = Boolean(project.github_owner && project.github_repo);

            return (
              <div
                key={project.id}
                className="devflow-dashboard-project-item"
                onClick={() => onNavigateToProjectWorkspace(project.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onNavigateToProjectWorkspace(project.id);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color || "#a855f7" }}
                    />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {formatProjectName(project.name)}
                    </span>
                  </div>

                  <span className="text-[11px] text-muted-foreground shrink-0 ml-1">
                    {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
                  </span>
                </div>

                {project.description && (
                  <p className="text-[11.5px] text-muted-foreground line-clamp-1 mt-1">
                    {project.description}
                  </p>
                )}

                {hasGitHub && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground min-w-0">
                    <GitHubIcon className="size-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 min-w-0">
                      {project.github_owner}/{project.github_repo}
                    </span>

                    {project.github_default_branch && (
                      <span className="flex items-center gap-1 font-mono text-[10px] bg-code-bg px-1.5 py-0.5 rounded border border-border/60 ml-auto shrink-0 max-w-28 truncate">
                        <GitBranch className="size-2.5 shrink-0" />
                        <span className="truncate">{project.github_default_branch}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
