import { useState } from "react";
import { Plus, FolderKanban, AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "../useProjects";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectWorkspace } from "../components/ProjectWorkspace";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { EditProjectModal } from "../components/EditProjectModal";
import type { DevProject, ProjectStatus } from "../types";
import "../projects.css";

export interface ProjectsPageProps {
  userId: string;
  selectedProjectId?: string | null;
  highlightTaskId?: string | null;
  onSelectProject?: (projectId: string | null) => void;
}

type FilterStatus = "all" | ProjectStatus;

export function ProjectsPage({
  userId,
  selectedProjectId: propSelectedProjectId,
  highlightTaskId,
  onSelectProject,
}: ProjectsPageProps) {
  const {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  } = useProjects(userId);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DevProject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [internalSelectedProjectId, setInternalSelectedProjectId] = useState<
    string | null
  >(null);

  const activeSelectedId =
    propSelectedProjectId !== undefined
      ? propSelectedProjectId
      : internalSelectedProjectId;

  const currentProject = projects.find((p) => p.id === activeSelectedId) || null;

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const archivedCount = projects.filter((p) => p.status === "archived").length;

  const filteredProjects = projects.filter((p) => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

  const handleDeleteProject = async (projectId: string) => {
    setDeletingId(projectId);
    setActionError(null);
    const { error: deleteErr } = await deleteProject(projectId);
    setDeletingId(null);

    if (deleteErr) {
      setActionError(deleteErr.message);
    } else if (activeSelectedId === projectId) {
      setInternalSelectedProjectId(null);
      onSelectProject?.(null);
    }
  };

  const handleSelectProject = (project: DevProject) => {
    setInternalSelectedProjectId(project.id);
    onSelectProject?.(project.id);
  };

  const handleBackToProjects = () => {
    setInternalSelectedProjectId(null);
    onSelectProject?.(null);
  };

  // If a project is selected, render its dedicated ProjectWorkspace
  if (currentProject) {
    return (
      <div className="devflow-projects-page is-workspace-active">
        <ProjectWorkspace
          userId={userId}
          project={currentProject}
          projects={projects}
          highlightTaskId={highlightTaskId}
          onBack={handleBackToProjects}
          onEditProject={(p) => setEditingProject(p)}
        />

        {/* Edit Project Modal */}
        <EditProjectModal
          project={editingProject}
          isOpen={Boolean(editingProject)}
          onClose={() => setEditingProject(null)}
          onSubmit={updateProject}
        />
      </div>
    );
  }

  return (
    <div className="devflow-projects-page">
      {/* Top Header Area */}
      <div className="devflow-projects-header">
        <div className="devflow-projects-title-group">
          <h1>Projects</h1>
          <p className="devflow-projects-subtitle">
            Organize and track your active codebases, workspaces, and repositories.
          </p>
        </div>

        <Button
          type="button"
          className="devflow-btn-primary gap-2 h-9 px-4"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="size-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* Global Query Error Banner */}
      {error && (
        <div className="devflow-project-alert is-error" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void refreshProjects()}
          >
            <RefreshCw className="size-3 mr-1" />
            <span>Try Again</span>
          </Button>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="devflow-project-alert is-error" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <div
        className="devflow-projects-filter-bar"
        role="tablist"
        aria-label="Filter projects by status"
      >
        <button
          type="button"
          role="tab"
          aria-selected={filterStatus === "all"}
          className={`devflow-filter-pill ${
            filterStatus === "all" ? "is-active" : ""
          }`}
          onClick={() => setFilterStatus("all")}
        >
          <span>All</span>
          <span className="devflow-filter-count">{projects.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterStatus === "active"}
          className={`devflow-filter-pill ${
            filterStatus === "active" ? "is-active" : ""
          }`}
          onClick={() => setFilterStatus("active")}
        >
          <span>Active</span>
          <span className="devflow-filter-count">{activeCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterStatus === "completed"}
          className={`devflow-filter-pill ${
            filterStatus === "completed" ? "is-active" : ""
          }`}
          onClick={() => setFilterStatus("completed")}
        >
          <span>Completed</span>
          <span className="devflow-filter-count">{completedCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterStatus === "archived"}
          className={`devflow-filter-pill ${
            filterStatus === "archived" ? "is-active" : ""
          }`}
          onClick={() => setFilterStatus("archived")}
        >
          <span>Archived</span>
          <span className="devflow-filter-count">{archivedCount}</span>
        </button>
      </div>

      {/* Initial Loading Skeleton Grid */}
      {loading && projects.length === 0 && (
        <div className="devflow-projects-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="devflow-project-skeleton">
              <div className="devflow-skeleton-bar is-title" />
              <div className="devflow-skeleton-bar is-sub" />
              <div className="devflow-skeleton-bar is-short mt-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Project Grid */}
      {!loading && filteredProjects.length > 0 && (
        <div className="devflow-projects-grid">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={handleSelectProject}
              onEdit={(p) => setEditingProject(p)}
              onDelete={handleDeleteProject}
              isDeleting={deletingId === project.id}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProjects.length === 0 && (
        <div className="devflow-projects-empty">
          <FolderKanban className="devflow-empty-icon" />
          <h3 className="devflow-empty-title">
            {filterStatus === "all"
              ? "No projects yet"
              : `No ${filterStatus} projects`}
          </h3>
          <p className="devflow-empty-desc">
            {filterStatus === "all"
              ? "Create your first project to organize your repositories, codebases, and development time."
              : `There are currently no projects marked as ${filterStatus}.`}
          </p>
          <Button
            type="button"
            className="devflow-btn-primary mt-2 gap-1.5 h-8 px-3 text-xs"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            <span>New Project</span>
          </Button>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={createProject}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        project={editingProject}
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        onSubmit={updateProject}
      />
    </div>
  );
}
