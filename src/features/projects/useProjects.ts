import { useEffect, useState } from "react";
import type { CreateProjectInput, DevProject, UpdateProjectInput } from "./types";
import {
  getProjects,
  createProject as createProjectApi,
  updateProject as updateProjectApi,
  deleteProject as deleteProjectApi,
} from "./projects";

export function useProjects(userId?: string) {
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isSubscribed = true;

    getProjects(userId).then(({ projects: fetchedProjects, error: fetchError }) => {
      if (!isSubscribed) return;

      if (fetchError) {
        console.error("Failed to load projects:", fetchError);
        setError(fetchError.message);
        setProjects([]);
      } else {
        setProjects(fetchedProjects || []);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  const createProject = async (
    input: CreateProjectInput
  ): Promise<{ project: DevProject | null; error: Error | null }> => {
    if (!userId) {
      const err = new Error("User must be authenticated to create a project");
      setError(err.message);
      return { project: null, error: err };
    }

    const { project: newProject, error: createError } = await createProjectApi(
      userId,
      input
    );

    if (createError) {
      setError(createError.message);
      return { project: null, error: createError };
    }

    if (newProject) {
      setProjects((prev) => [
        newProject,
        ...prev.filter((p) => p.id !== newProject.id),
      ]);
      setError(null);
    }

    return { project: newProject, error: null };
  };

  const updateProject = async (
    projectId: string,
    input: UpdateProjectInput
  ): Promise<{ project: DevProject | null; error: Error | null }> => {
    const { project: updatedProject, error: updateError } = await updateProjectApi(
      projectId,
      input
    );

    if (updateError) {
      setError(updateError.message);
      return { project: null, error: updateError };
    }

    if (updatedProject) {
      setProjects((prev) => {
        const updatedList = prev.map((p) =>
          p.id === projectId ? updatedProject : p
        );
        return updatedList.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
      setError(null);
    }

    return { project: updatedProject, error: null };
  };

  const deleteProject = async (
    projectId: string
  ): Promise<{ error: Error | null }> => {
    const { error: deleteError } = await deleteProjectApi(projectId);

    if (deleteError) {
      setError(deleteError.message);
      return { error: deleteError };
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setError(null);
    return { error: null };
  };

  const refreshProjects = async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    const { projects: fetchedProjects, error: fetchError } = await getProjects(
      userId
    );

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProjects(fetchedProjects || []);
      setError(null);
    }
    setLoading(false);
  };

  return {
    projects: userId ? projects : [],
    loading: userId ? loading : false,
    error: userId ? error : null,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  };
}
