export type KnowledgeCategory =
  | "Architecture"
  | "Bugfix"
  | "Performance"
  | "Security"
  | "Database"
  | "Frontend"
  | "Backend"
  | "DevOps"
  | "Other";

export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = [
  "Architecture",
  "Bugfix",
  "Performance",
  "Security",
  "Database",
  "Frontend",
  "Backend",
  "DevOps",
  "Other",
] as const;

export type KnowledgeFilterCategory = "all" | KnowledgeCategory;

export interface KnowledgeNote {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  problem: string | null;
  investigation: string | null;
  root_cause: string | null;
  solution: string | null;
  lessons_learned: string | null;
  content: string | null;
  project_id: string | null;
  task_id: string | null;
  category: KnowledgeCategory;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeNoteInput {
  title: string;
  summary?: string | null;
  problem?: string | null;
  investigation?: string | null;
  root_cause?: string | null;
  solution?: string | null;
  lessons_learned?: string | null;
  content?: string | null;
  project_id?: string | null;
  task_id?: string | null;
  category?: KnowledgeCategory;
  tags?: string[];
  is_pinned?: boolean;
}

export interface UpdateKnowledgeNoteInput {
  title?: string;
  summary?: string | null;
  problem?: string | null;
  investigation?: string | null;
  root_cause?: string | null;
  solution?: string | null;
  lessons_learned?: string | null;
  content?: string | null;
  project_id?: string | null;
  task_id?: string | null;
  category?: KnowledgeCategory;
  tags?: string[];
  is_pinned?: boolean;
}
