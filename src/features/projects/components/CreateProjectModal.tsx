import { useState } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PRESET_COLORS } from "../types";
import type { CreateProjectInput, DevProject, ProjectStatus } from "../types";
import { ProjectGitHubSection } from "../../github/components/ProjectGitHubSection";
import type { ProjectGitHubConfig } from "../../github/types";

export interface CreateProjectModalProps {
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    input: CreateProjectInput
  ) => Promise<{ project: DevProject | null; error: Error | null }>;
}

export function CreateProjectModal({
  userId,
  isOpen,
  onClose,
  onSubmit,
}: CreateProjectModalProps) {
  if (!isOpen) return null;

  return (
    <CreateProjectModalForm
      userId={userId}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface CreateProjectModalFormProps {
  userId?: string;
  onClose: () => void;
  onSubmit: (
    input: CreateProjectInput
  ) => Promise<{ project: DevProject | null; error: Error | null }>;
}

function CreateProjectModalForm({
  userId,
  onClose,
  onSubmit,
}: CreateProjectModalFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [color, setColor] = useState<string>("#a855f7");
  const [githubConfig, setGithubConfig] = useState<ProjectGitHubConfig>({
    github_repository_id: null,
    github_owner: null,
    github_repo: null,
    github_default_branch: null,
    github_installation_id: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { project, error } = await onSubmit({
      name: trimmedName,
      description: description.trim() || undefined,
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
          : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (project) {
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
      aria-labelledby="create-project-title"
    >
      <div className="devflow-project-modal-card">
        <div className="devflow-project-modal-header">
          <h2 id="create-project-title" className="devflow-project-modal-title">
            Create New Project
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
              <Label htmlFor="create-project-name" className="devflow-field-label">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <input
                id="create-project-name"
                type="text"
                placeholder="e.g. DevFlow Core"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
                autoFocus
                className="devflow-project-input"
              />
            </div>

            <div className="devflow-field-group">
              <Label htmlFor="create-project-desc" className="devflow-field-label">
                Description (optional)
              </Label>
              <textarea
                id="create-project-desc"
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
              userId={userId}
              config={githubConfig}
              onChange={setGithubConfig}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="devflow-field-group">
                <Label htmlFor="create-project-status" className="devflow-field-label">
                  Status
                </Label>
                <select
                  id="create-project-status"
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
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
