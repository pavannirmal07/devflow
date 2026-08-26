import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { ComponentType } from "react";
import {
  Search,
  Plus,
  Play,
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Timer,
  BookOpen,
  Settings,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DevTask } from "@/features/tasks/types";
import type { DevProject } from "@/features/projects/types";
import type { DevSession } from "@/features/sessions/types";
import type { KnowledgeNote } from "@/features/knowledge/types";
import type { TaskGitHubLink } from "@/features/github/types";
import { GitHubIcon } from "@/features/github/components/GitHubIcon";
import type { NavItemId } from "@/components/layout/AppShell";
import "./commandPalette.css";

export type CommandCategory =
  | "quick_actions"
  | "navigation"
  | "projects"
  | "tasks"
  | "knowledge";

export interface CommandItem {
  id: string;
  category: CommandCategory;
  title: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
  color?: string | null;
  statusBadge?: string;
  priorityBadge?: string;
  projectContext?: { name: string; color: string | null };
  searchTerms?: string;
  onSelect: () => void;
  onFocusAction?: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: DevTask[];
  projects: DevProject[];
  knowledgeNotes?: KnowledgeNote[];
  githubLinksMap?: Record<string, TaskGitHubLink[]>;
  activeSession: DevSession | null;
  onNavigate: (nav: NavItemId, param?: string, taskId?: string) => void;
  onStartFocus: (task: DevTask) => Promise<void> | void;
  onCreateTask: () => void;
  onCreateNote?: () => void;
}

interface CommandPaletteModalProps {
  onClose: () => void;
  tasks: DevTask[];
  projects: DevProject[];
  knowledgeNotes?: KnowledgeNote[];
  githubLinksMap?: Record<string, TaskGitHubLink[]>;
  activeSession: DevSession | null;
  onNavigate: (nav: NavItemId, param?: string, taskId?: string) => void;
  onStartFocus: (task: DevTask) => Promise<void> | void;
  onCreateTask: () => void;
  onCreateNote?: () => void;
}

function CommandPaletteModal({
  onClose,
  tasks,
  projects,
  knowledgeNotes = [],
  githubLinksMap = {},
  activeSession,
  onNavigate,
  onStartFocus,
  onCreateTask,
  onCreateNote,
}: CommandPaletteModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fast project map
  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    for (const p of projects) {
      map.set(p.id, { name: p.name, color: p.color });
    }
    return map;
  }, [projects]);

  // Handle focus session trigger with active-session protection
  const handleTriggerFocus = useCallback(
    async (task: DevTask) => {
      if (task.status === "completed") {
        setNotice(
          `Cannot focus on completed task: "${task.title}". Reopen it first.`
        );
        return;
      }

      if (activeSession) {
        setNotice(
          `A focus session is already active: "${activeSession.title}". Complete or pause it before starting another.`
        );
        return;
      }

      setNotice(null);
      onClose();
      await onStartFocus(task);
    },
    [activeSession, onClose, onStartFocus]
  );

  // Build command items list
  const allItems = useMemo(() => {
    const items: CommandItem[] = [];

    // 1. Quick Actions
    items.push({
      id: "action-new-task",
      category: "quick_actions",
      title: "New Task",
      subtitle: "Create a new development task",
      icon: Plus,
      onSelect: () => {
        onClose();
        onCreateTask();
      },
    });

    if (onCreateNote) {
      items.push({
        id: "action-new-note",
        category: "quick_actions",
        title: "New Technical Note",
        subtitle: "Document a bug investigation, solution, or engineering lesson",
        icon: BookOpen,
        onSelect: () => {
          onClose();
          onCreateNote();
        },
      });
    }

    if (activeSession) {
      items.push({
        id: "action-active-session",
        category: "quick_actions",
        title: "Active Focus Session",
        subtitle: `${activeSession.status === "active" ? "Running" : "Paused"}: "${activeSession.title}"`,
        icon: Timer,
        onSelect: () => {
          onClose();
          onNavigate("sessions");
        },
      });
    }

    // Quick Actions: Open GitHub Repository for connected projects
    for (const p of projects) {
      if (p.github_owner && p.github_repo) {
        const repoFullName = `${p.github_owner}/${p.github_repo}`;
        const repoUrl = p.github_url || `https://github.com/${repoFullName}`;
        items.push({
          id: `action-gh-repo-${p.id}`,
          category: "quick_actions",
          title: `Open GitHub: ${p.name}`,
          subtitle: repoFullName,
          icon: GitHubIcon,
          onSelect: () => {
            onClose();
            window.open(repoUrl, "_blank", "noopener,noreferrer");
          },
        });
      }
    }

    // 2. Navigation
    const navs: {
      id: NavItemId;
      label: string;
      icon: ComponentType<{ className?: string }>;
    }[] = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "tasks", label: "Tasks", icon: ListTodo },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "sessions", label: "Sessions", icon: Timer },
      { id: "knowledge", label: "Knowledge", icon: BookOpen },
      { id: "settings", label: "Settings", icon: Settings },
    ];

    for (const nav of navs) {
      items.push({
        id: `nav-${nav.id}`,
        category: "navigation",
        title: nav.label,
        subtitle: `Jump to ${nav.label}`,
        icon: nav.icon,
        onSelect: () => {
          onClose();
          onNavigate(nav.id);
        },
      });
    }

    // 3. Projects
    for (const p of projects) {
      const taskCount = tasks.filter((t) => t.project_id === p.id).length;
      items.push({
        id: `project-${p.id}`,
        category: "projects",
        title: p.name,
        subtitle: p.description
          ? `${p.description} · ${taskCount} tasks`
          : `${taskCount} tasks · ${p.status}`,
        color: p.color || "#a855f7",
        statusBadge: p.status,
        onSelect: () => {
          onClose();
          onNavigate("projects", p.id);
        },
      });
    }

    // 4. Tasks with GitHub search terms indexing
    for (const t of tasks) {
      const proj = t.project_id ? projectMap.get(t.project_id) : undefined;
      const ghLinks = githubLinksMap[t.id] || [];

      const ghTerms = ghLinks
        .flatMap((link) => {
          const terms = [link.name, link.github_id];
          if (link.metadata) {
            if (link.metadata.branch_name) terms.push(String(link.metadata.branch_name));
            if (link.metadata.pr_number) {
              terms.push(String(link.metadata.pr_number));
              terms.push(`#${link.metadata.pr_number}`);
            }
            if (link.metadata.issue_number) {
              terms.push(String(link.metadata.issue_number));
              terms.push(`#${link.metadata.issue_number}`);
            }
            if (link.metadata.commit_sha) terms.push(String(link.metadata.commit_sha));
            if (link.metadata.commit_author) terms.push(String(link.metadata.commit_author));
            if (link.metadata.issue_author) terms.push(String(link.metadata.issue_author));
          }
          return terms;
        })
        .join(" ");

      const taskSearchTerms = [
        t.title,
        t.description || "",
        proj?.name || "",
        ghTerms,
      ]
        .join(" ")
        .toLowerCase();

      items.push({
        id: `task-${t.id}`,
        category: "tasks",
        title: t.title,
        subtitle: t.description || undefined,
        icon: ListTodo,
        statusBadge: t.status,
        priorityBadge: t.priority,
        projectContext: proj
          ? { name: proj.name, color: proj.color }
          : undefined,
        searchTerms: taskSearchTerms,
        onSelect: () => {
          onClose();
          if (t.project_id) {
            onNavigate("projects", t.project_id, t.id);
          } else {
            onNavigate("tasks", undefined, t.id);
          }
        },
        onFocusAction: () => {
          void handleTriggerFocus(t);
        },
      });
    }

    // 5. Technical Notes (Knowledge)
    for (const n of knowledgeNotes) {
      const proj = n.project_id ? projectMap.get(n.project_id) : undefined;
      const searchTerms = [
        n.title,
        n.summary || "",
        n.problem || "",
        n.investigation || "",
        n.root_cause || "",
        n.solution || "",
        n.lessons_learned || "",
        n.content || "",
        n.category || "",
        ...(n.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      items.push({
        id: `note-${n.id}`,
        category: "knowledge",
        title: n.title,
        subtitle: n.summary || n.problem || n.solution || `${n.category} Note`,
        icon: BookOpen,
        statusBadge: n.category,
        projectContext: proj
          ? { name: proj.name, color: proj.color }
          : undefined,
        searchTerms,
        onSelect: () => {
          onClose();
          onNavigate("knowledge", n.id);
        },
      });
    }

    return items;
  }, [
    projects,
    tasks,
    knowledgeNotes,
    githubLinksMap,
    activeSession,
    projectMap,
    onClose,
    onCreateTask,
    onCreateNote,
    onNavigate,
    handleTriggerFocus,
  ]);

  // Filtered items based on query
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      // Default view when empty: Quick Actions, Navigation, Top Projects, active tasks, and pinned notes
      return allItems.filter((item) => {
        if (
          item.category === "quick_actions" ||
          item.category === "navigation"
        )
          return true;
        if (item.category === "projects") return true;
        if (item.category === "tasks") {
          return (
            item.statusBadge === "in_progress" ||
            item.priorityBadge === "urgent" ||
            item.priorityBadge === "high"
          );
        }
        if (item.category === "knowledge") {
          return knowledgeNotes.some((kn) => `note-${kn.id}` === item.id && kn.is_pinned);
        }
        return true;
      });
    }

    return allItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
      const matchProject = item.projectContext?.name.toLowerCase().includes(q);
      const matchStatus = item.statusBadge?.toLowerCase().includes(q);
      const matchPriority = item.priorityBadge?.toLowerCase().includes(q);
      const matchSearchTerms = item.searchTerms?.includes(q);
      return (
        matchTitle ||
        matchSubtitle ||
        matchProject ||
        matchStatus ||
        matchPriority ||
        matchSearchTerms
      );
    });
  }, [allItems, search, knowledgeNotes]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: {
      category: CommandCategory;
      label: string;
      items: CommandItem[];
    }[] = [
      { category: "quick_actions", label: "Quick Actions", items: [] },
      { category: "navigation", label: "Navigation", items: [] },
      { category: "projects", label: "Projects", items: [] },
      { category: "tasks", label: "Tasks", items: [] },
      { category: "knowledge", label: "Technical Notes", items: [] },
    ];

    for (const item of filteredItems) {
      const g = groups.find((grp) => grp.category === item.category);
      if (g) g.items.push(item);
    }

    return groups.filter((g) => g.items.length > 0);
  }, [filteredItems]);

  // Flat list of visible items for keyboard indexing
  const flatVisibleItems = useMemo(() => {
    return groupedItems.flatMap((g) => g.items);
  }, [groupedItems]);

  // Safely clamp selected index during render without calling setState in an effect
  const safeSelectedIndex =
    flatVisibleItems.length === 0
      ? 0
      : Math.min(Math.max(0, selectedIndex), flatVisibleItems.length - 1);

  // Auto-scroll active item into view
  useEffect(() => {
    const el = itemRefs.current[safeSelectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [safeSelectedIndex]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (flatVisibleItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatVisibleItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + flatVisibleItems.length) % flatVisibleItems.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = flatVisibleItems[safeSelectedIndex];
      if (current) {
        current.onSelect();
      }
    }
  };

  let globalIndexCounter = 0;

  return (
    <div
      className="devflow-command-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      <div className="devflow-command-modal" onKeyDown={handleKeyDown}>
        {/* Header with Search Input */}
        <div className="devflow-command-header">
          <Search className="size-4 devflow-command-search-icon" />
          <input
            ref={inputRef}
            id="command-palette-title"
            type="text"
            className="devflow-command-input"
            placeholder="Search commands, tasks, projects, notes... (↑↓ to navigate)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Search commands, tasks, projects, and technical notes"
            autoComplete="off"
            spellCheck={false}
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setSearch("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </Button>
          )}
          <kbd
            className="devflow-command-esc-badge"
            title="Press Escape to close"
          >
            Esc
          </kbd>
        </div>

        {/* Inline Notice Banner (if any active session or warning) */}
        {notice && (
          <div className="devflow-command-alert" role="alert">
            <div className="devflow-command-alert-left">
              <AlertCircle className="size-3.5 text-amber-500 shrink-0" />
              <span className="truncate">{notice}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setNotice(null)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss notice"
            >
              <X className="size-3" />
            </Button>
          </div>
        )}

        {/* Results List */}
        <div className="devflow-command-body" ref={listRef} role="listbox">
          {flatVisibleItems.length === 0 ? (
            <div className="devflow-command-empty">
              <Sparkles className="size-6 text-muted-foreground opacity-50" />
              <p className="devflow-command-empty-title">No matching results</p>
              <p className="devflow-command-empty-desc">
                No commands, tasks, or projects found for "{search}".
              </p>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.category} className="devflow-command-group">
                <div className="devflow-command-group-heading">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const itemIndex = globalIndexCounter++;
                  const isSelected = itemIndex === safeSelectedIndex;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[itemIndex] = el;
                      }}
                      className={`devflow-command-item ${isSelected ? "is-selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => item.onSelect()}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <div className="devflow-command-item-left">
                        {item.color ? (
                          <span
                            className="devflow-command-project-dot"
                            style={{ backgroundColor: item.color }}
                          />
                        ) : Icon ? (
                          <Icon className="size-4 devflow-command-item-icon" />
                        ) : null}

                        <div className="flex flex-col min-w-0">
                          <span className="devflow-command-item-title">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="devflow-command-item-subtitle">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="devflow-command-item-right">
                        {item.projectContext && (
                          <span
                            className="devflow-task-project-pill text-[10.5px] py-0 px-1.5"
                            title={item.projectContext.name}
                          >
                            <span
                              className="devflow-task-project-dot"
                              style={{
                                backgroundColor:
                                  item.projectContext.color || "#a855f7",
                              }}
                            />
                            <span className="truncate max-w-24">
                              {item.projectContext.name}
                            </span>
                          </span>
                        )}

                        {item.priorityBadge && (
                          <span
                            className={`devflow-task-priority-badge is-${item.priorityBadge} text-[10px] py-0 px-1.5`}
                          >
                            {item.priorityBadge}
                          </span>
                        )}

                        {item.statusBadge && (
                          <span
                            className={`devflow-task-status-badge is-${item.statusBadge} text-[10px] py-0 px-1.5`}
                          >
                            {item.statusBadge.replace("_", " ")}
                          </span>
                        )}

                        {item.onFocusAction &&
                          item.statusBadge !== "completed" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              className="devflow-command-focus-btn"
                              title="Start Focus Session on this task"
                              onClick={(e) => {
                                e.stopPropagation();
                                item.onFocusAction?.();
                              }}
                            >
                              <Play className="size-3 fill-current text-amber-500" />
                              <span>Focus</span>
                            </Button>
                          )}

                        {isSelected && !item.onFocusAction && (
                          <ArrowRight className="size-3.5 text-accent opacity-80" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer with Keyboard Hints */}
        <div className="devflow-command-footer">
          <div className="devflow-command-footer-hints">
            <span className="devflow-command-hint">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="devflow-command-hint">
              <kbd>↵</kbd>
              <span>Select</span>
            </span>
            <span className="devflow-command-hint">
              <kbd>Esc</kbd>
              <span>Close</span>
            </span>
          </div>
          <span className="text-[11px] opacity-70">
            DevFlow Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}

export function CommandPalette({
  isOpen,
  onClose,
  tasks,
  projects,
  knowledgeNotes = [],
  githubLinksMap = {},
  activeSession,
  onNavigate,
  onStartFocus,
  onCreateTask,
  onCreateNote,
}: CommandPaletteProps) {
  if (!isOpen) return null;

  return (
    <CommandPaletteModal
      onClose={onClose}
      tasks={tasks}
      projects={projects}
      knowledgeNotes={knowledgeNotes}
      githubLinksMap={githubLinksMap}
      activeSession={activeSession}
      onNavigate={onNavigate}
      onStartFocus={onStartFocus}
      onCreateTask={onCreateTask}
      onCreateNote={onCreateNote}
    />
  );
}
