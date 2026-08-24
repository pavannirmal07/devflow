import { useState } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PRESET_COLORS } from "../types";
import type { DevProject, ProjectStatus, UpdateProjectInput } from "../types";
import { ProjectGitHubSection } from "../../github/components/ProjectGitHubSection";
import type { ProjectGitHubConfig } from "../../github/types";

export interface EditProjectModalProps {
  project: DevProject | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    projectId: string,
    input: UpdateProjectInput
  ) => Promise<{ project: DevProject | null; error: Error | null }>;
}

export function EditProjectModal({
  project,
  isOpen,
  onClose,
  onSubmit,
}: EditProjectModalProps) {
  if (!isOpen || !project) return null;

  return (
    <EditProjectModalForm
      key={project.id}
      project={project}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface EditProjectModalFormProps {
  project: DevProject;
  onClose: () => void;
  onSubmit: (
    projectId: string,
    input: UpdateProjectInput
  ) => Promise<{ project: DevProject | null; error: Error | null }>;
}

function EditProjectModalForm({
  project,
  onClose,
  onSubmit,
}: EditProjectModalFormProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [color, setColor] = useState<string>(project.color || "#a855f7");
  const [githubConfig, setGithubConfig] = useState<ProjectGitHubConfig>({
    github_repository_id: project.github_repository_id,
    github_owner: project.github_owner,
    github_repo: project.github_repo,
    github_default_branch: project.github_default_branch,
    github_installation_id: project.github_installation_id,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { project: updated, error } = await onSubmit(project.id, {
      name: trimmedName,
      description: description.trim() || null,
      status,
      color,
      github_repository_id: githubConfig.github_repository_id,
      github_owner: githubConfig.github_owner,
      github_repo: githubConfig.github_repo,
      github_default_branch: githubConfig.github_default_branch,
      github_installation_id: githubConfig.github_installation_id,
      github_url:
        githubConfig.github_owner && githubConfig.github_repo
          ? `https://github.com/${githubConfig.github_owner}/${githubConfig.github_repo}`
          : null,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (updated) {
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
      className="devflow-project-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
    >
      <div className="devflow-project-modal-card">
        <div className="devflow-project-modal-header">
          <h2 id="edit-project-title" className="devflow-project-modal-title">
            Edit Project
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
          <div className="devflow-project-alert is-error" role="alert">
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

        <form onSubmit={handleSubmit} className="devflow-project-modal-form">
          <div className="devflow-project-modal-fields">
            <div className="devflow-field-group">
              <Label htmlFor="edit-project-name" className="devflow-field-label">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <input
                id="edit-project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
                className="devflow-project-input"
              />
            </div>

            <div className="devflow-field-group">
              <Label htmlFor="edit-project-desc" className="devflow-field-label">
                Description (optional)
              </Label>
              <textarea
                id="edit-project-desc"
                rows={3}
                placeholder="Brief summary of the codebase or goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="devflow-project-textarea"
              />
            </div>

            {/* GitHub Repository Integration Section */}
            <ProjectGitHubSection
              userId={project.user_id}
              config={githubConfig}
              onChange={setGithubConfig}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="devflow-field-group">
                <Label htmlFor="edit-project-status" className="devflow-field-label">
                  Status
                </Label>
                <select
                  id="edit-project-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  disabled={isSubmitting}
                  className="devflow-project-select"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="devflow-field-group">
                <Label className="devflow-field-label">Theme Color</Label>
                <div className="devflow-color-swatches" role="radiogroup" aria-label="Project color">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={color === c.value}
                      aria-label={c.label}
                      title={c.label}
                      className={`devflow-color-swatch ${
                        color === c.value ? "is-selected" : ""
                      }`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(c.value)}
                      disabled={isSubmitting}
                    >
                      {color === c.value && <Check className="size-3.5 stroke-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="devflow-project-modal-actions">
            <Button
              type="button"
              className="devflow-btn-secondary h-9 px-4"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="devflow-btn-primary h-9 px-4"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
