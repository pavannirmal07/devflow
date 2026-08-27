import { useState, useEffect, lazy, Suspense } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Timer,
  BookOpen,
  Settings,
  Info,
  Zap,
  Menu,
  X,
  LogOut,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSessions } from "@/features/sessions/useSessions";
import { useProjects } from "@/features/projects/useProjects";
import { useTasks } from "@/features/tasks/useTasks";
import { useKnowledge } from "@/features/knowledge/useKnowledge";
import type { DevTask } from "@/features/tasks/types";
import "./AppShell.css";

const CommandPalette = lazy(() =>
  import("@/components/command/CommandPalette").then((module) => ({
    default: module.CommandPalette,
  }))
);

const CreateTaskModal = lazy(() =>
  import("@/features/tasks/components/CreateTaskModal").then((module) => ({
    default: module.CreateTaskModal,
  }))
);

const NoteModal = lazy(() =>
  import("@/features/knowledge/components/NoteModal").then((module) => ({
    default: module.NoteModal,
  }))
);

const DashboardPage = lazy(() =>
  import("@/features/dashboard/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  }))
);

const ProjectsPage = lazy(() =>
  import("@/features/projects/pages/ProjectsPage").then((module) => ({
    default: module.ProjectsPage,
  }))
);

const TasksPage = lazy(() =>
  import("@/features/tasks/pages/TasksPage").then((module) => ({
    default: module.TasksPage,
  }))
);

const SessionsPage = lazy(() =>
  import("@/features/sessions/pages/SessionsPage").then((module) => ({
    default: module.SessionsPage,
  }))
);

const KnowledgePage = lazy(() =>
  import("@/features/knowledge/pages/KnowledgePage").then((module) => ({
    default: module.KnowledgePage,
  }))
);

const SettingsPage = lazy(() =>
  import("@/features/settings/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
);

const AboutPage = lazy(() =>
  import("@/features/about/pages/AboutPage").then((module) => ({
    default: module.AboutPage,
  }))
);

function PageLoadingFallback() {
  return (
    <div
      className="flex items-center justify-center p-12 min-h-75"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2.5 text-muted-foreground text-sm font-medium">
        <Zap className="size-4 animate-pulse text-accent shrink-0" />
        <span>Loading...</span>
      </div>
    </div>
  );
}

export interface AppShellProps {
  userId?: string;
  userEmail?: string;
  userName?: string;
  onSignOut: () => void;
  children?: ReactNode;
}

export type NavItemId =
  | "dashboard"
  | "projects"
  | "tasks"
  | "sessions"
  | "knowledge"
  | "settings"
  | "about";

interface NavItem {
  id: NavItemId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "sessions", label: "Sessions", icon: Timer },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "about", label: "About", icon: Info },
];

function getNavFromHash(): {
  nav: NavItemId;
  projectId?: string;
  taskId?: string;
  noteId?: string;
} {
  if (typeof window === "undefined") return { nav: "dashboard" };
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = rawHash.split("?");
  const [navPart, idPart] = (pathPart || "").split("/");
  const normalizedNav = (navPart || "").toLowerCase();
  const matched = NAV_ITEMS.find((item) => item.id === normalizedNav);

  let taskId: string | undefined;
  let noteId: string | undefined;
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    taskId = params.get("task") || undefined;
    noteId = params.get("note") || undefined;
  }

  if (normalizedNav === "knowledge" && idPart) {
    noteId = idPart;
  }

  return {
    nav: matched ? matched.id : "dashboard",
    projectId:
      (normalizedNav === "projects" || normalizedNav === "project") && idPart
        ? idPart
        : undefined,
    taskId,
    noteId,
  };
}

function getGreetingName(email?: string, name?: string): string {
  if (name && name.trim()) {
    return `Hi, Dev ${name.trim()}`;
  }
  if (!email) {
    return "Hi, Dev Developer";
  }
  const namePart = email.split("@")[0];
  const parts = namePart.split(/[._-]/).filter(Boolean);
  if (parts.length > 0) {
    const fallbackName = parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
    return `Hi, Dev ${fallbackName}`;
  }
  return "Hi, Dev Developer";
}

export function AppShell({
  userId,
  userEmail,
  userName,
  onSignOut,
  children,
}: AppShellProps) {
  const [navState, setNavState] = useState<{
    nav: NavItemId;
    projectId?: string;
    taskId?: string;
    noteId?: string;
  }>(() => getNavFromHash());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);

  // Global state hooks for command palette
  const { projects } = useProjects(userId);
  const {
    tasks,
    createTask,
    refreshTasks,
    githubLinksMap,
    updateTaskGitHubLinks,
  } = useTasks(userId);
  const { activeSession, startSession } = useSessions(userId);
  const { notes: knowledgeNotes, createNote: createKnowledgeNote } = useKnowledge(userId);

  const activeNav = navState.nav;

  useEffect(() => {
    const handleLocationChange = () => {
      setNavState(getNavFromHash());
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);

        if (!isEditable || (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setIsCommandPaletteOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectNav = (
    id: NavItemId,
    param?: string,
    taskId?: string,
    noteId?: string
  ) => {
    setNavState({
      nav: id,
      projectId: id === "projects" ? param : undefined,
      taskId,
      noteId: id === "knowledge" ? param || noteId : undefined,
    });
    let newHash = `#${id}`;
    if (id === "projects" && param) {
      newHash = `#projects/${param}`;
      if (taskId) {
        newHash += `?task=${encodeURIComponent(taskId)}`;
      }
    } else if (id === "knowledge" && (param || noteId)) {
      newHash = `#knowledge/${encodeURIComponent(param || noteId || "")}`;
    } else if (id === "tasks" && taskId) {
      newHash += `?task=${encodeURIComponent(taskId)}`;
    }
    window.history.pushState(null, "", newHash);
    setMobileMenuOpen(false);
  };

  const handleStartFocusFromPalette = async (task: DevTask) => {
    if (activeSession) return;
    const { session } = await startSession({
      title: task.title,
      description: task.description || undefined,
      task_id: task.id,
    });
    if (session) {
      await refreshTasks();
      if (task.project_id) {
        handleSelectNav("projects", task.project_id, task.id);
      } else {
        handleSelectNav("tasks", undefined, task.id);
      }
    }
  };

  const activeItem = NAV_ITEMS.find((item) => item.id === activeNav);
  const displayName = getGreetingName(userEmail, userName);
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform?.toUpperCase().includes("MAC");

  return (
    <div className="devflow-shell">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="devflow-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation / Mobile Drawer */}
      <aside
        className={`devflow-sidebar ${mobileMenuOpen ? "is-open" : ""}`}
        aria-label="Sidebar Navigation"
      >
        <div className="devflow-sidebar-header">
          <div className="devflow-logo">
            <Zap className="devflow-logo-icon" />
            <span className="devflow-logo-text">DevFlow</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="devflow-mobile-close h-10 w-10 shrink-0"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="devflow-nav">
          <ul className="devflow-nav-list">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeNav;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className={`devflow-nav-button ${isActive ? "is-active" : ""}`}
                    onClick={() => handleSelectNav(item.id)}
                  >
                    <Icon className="devflow-nav-icon shrink-0" />
                    <span className="devflow-nav-label">{item.label}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer (Account Area: Greeting & Sign Out) */}
        <div className="devflow-sidebar-footer">
          <div className="devflow-sidebar-user-greeting">
            {displayName}
          </div>
          <Button
            type="button"
            variant="outline"
            className="devflow-sidebar-signout-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              onSignOut();
            }}
          >
            <LogOut className="size-4 shrink-0" />
            <span>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="devflow-container">
        {/* Top Header Area */}
        <header className="devflow-header">
          <div className="devflow-header-left">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="devflow-menu-toggle h-10 w-10 shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <h1 className="devflow-header-title">
              {activeItem ? activeItem.label : "Dashboard"}
            </h1>
          </div>

          <div className="devflow-header-right">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="devflow-header-command-btn"
              onClick={() => setIsCommandPaletteOpen(true)}
              aria-label="Open command palette (Ctrl+K)"
            >
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <span className="devflow-header-command-text">Search or jump to...</span>
              <kbd className="devflow-header-command-kbd">
                <span>{isMac ? "⌘" : "Ctrl "}</span>K
              </kbd>
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="devflow-main">
          {children || (
            <Suspense fallback={<PageLoadingFallback />}>
              {activeNav === "dashboard" && userId ? (
                <DashboardPage
                  userId={userId}
                  userName={userName}
                  onNavigate={handleSelectNav}
                />
              ) : activeNav === "sessions" && userId ? (
                <SessionsPage userId={userId} />
              ) : activeNav === "projects" && userId ? (
                <ProjectsPage
                  userId={userId}
                  selectedProjectId={navState.projectId || null}
                  highlightTaskId={navState.taskId || null}
                  onSelectProject={(projId) => {
                    if (projId) {
                      setNavState({ nav: "projects", projectId: projId, taskId: undefined });
                      window.history.pushState(null, "", `#projects/${projId}`);
                    } else {
                      setNavState({ nav: "projects", projectId: undefined, taskId: undefined });
                      window.history.pushState(null, "", `#projects`);
                    }
                  }}
                />
              ) : activeNav === "tasks" && userId ? (
                <TasksPage
                  userId={userId}
                  highlightTaskId={navState.taskId || null}
                  onNavigateToKnowledge={(noteId) => {
                    if (noteId) {
                      handleSelectNav("knowledge", noteId);
                    } else {
                      handleSelectNav("knowledge");
                    }
                  }}
                />
              ) : activeNav === "knowledge" && userId ? (
                <KnowledgePage
                  userId={userId}
                  selectedNoteId={navState.noteId || null}
                  onSelectNote={(noteId) => {
                    if (noteId) {
                      setNavState({ nav: "knowledge", noteId });
                      window.history.pushState(null, "", `#knowledge/${noteId}`);
                    } else {
                      setNavState({ nav: "knowledge", noteId: undefined });
                      window.history.pushState(null, "", `#knowledge`);
                    }
                  }}
                  onNavigateToProject={(projId) => handleSelectNav("projects", projId)}
                  onNavigateToTask={(tId, pId) => {
                    if (pId) {
                      handleSelectNav("projects", pId, tId);
                    } else {
                      handleSelectNav("tasks", undefined, tId);
                    }
                  }}
                />
              ) : activeNav === "settings" ? (
                <SettingsPage />
              ) : activeNav === "about" ? (
                <AboutPage />
              ) : (
                <div className="devflow-placeholder-card">
                  <h2>{activeItem?.label}</h2>
                  <p>
                    This section is currently under development. Selected tab:{" "}
                    <code>{activeNav}</code>
                  </p>
                </div>
              )}
            </Suspense>
          )}
        </main>
      </div>

      {/* Global Command Palette */}
      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            tasks={tasks}
            projects={projects}
            knowledgeNotes={knowledgeNotes}
            githubLinksMap={githubLinksMap}
            activeSession={activeSession}
            onNavigate={handleSelectNav}
            onStartFocus={handleStartFocusFromPalette}
            onCreateTask={() => setIsCreateTaskOpen(true)}
            onCreateNote={() => setIsCreateNoteOpen(true)}
          />
        </Suspense>
      )}

      {/* Global Create Task Modal */}
      {isCreateTaskOpen && (
        <Suspense fallback={null}>
          <CreateTaskModal
            isOpen={isCreateTaskOpen}
            projects={projects}
            onClose={() => setIsCreateTaskOpen(false)}
            onSubmit={createTask}
            onLinkCreated={updateTaskGitHubLinks}
          />
        </Suspense>
      )}

      {/* Global Create Technical Note Modal */}
      {isCreateNoteOpen && (
        <Suspense fallback={null}>
          <NoteModal
            isOpen={isCreateNoteOpen}
            projects={projects}
            tasks={tasks}
            onClose={() => setIsCreateNoteOpen(false)}
            onSubmit={async (input) => {
              return createKnowledgeNote(input);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
