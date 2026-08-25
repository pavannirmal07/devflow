import { useState, useEffect } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Timer,
  BookOpen,
  Settings,
  Zap,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardPage } from "@/features/dashboard";
import { SessionsPage } from "@/features/sessions";
import { ProjectsPage } from "@/features/projects";
import { TasksPage } from "@/features/tasks";
import "./AppShell.css";


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
  | "settings";

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
];

function getNavFromHash(): { nav: NavItemId; projectId?: string } {
  if (typeof window === "undefined") return { nav: "dashboard" };
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const [navPart, idPart] = rawHash.split("/");
  const normalizedNav = (navPart || "").toLowerCase();
  const matched = NAV_ITEMS.find((item) => item.id === normalizedNav);
  return {
    nav: matched ? matched.id : "dashboard",
    projectId: (normalizedNav === "projects" || normalizedNav === "project") && idPart ? idPart : undefined,
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
  const [navState, setNavState] = useState<{ nav: NavItemId; projectId?: string }>(() =>
    getNavFromHash()
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleSelectNav = (id: NavItemId, param?: string) => {
    setNavState({ nav: id, projectId: param });
    if (id === "projects" && param) {
      window.history.pushState(null, "", `#projects/${param}`);
    } else {
      window.history.pushState(null, "", `#${id}`);
    }
    setMobileMenuOpen(false);
  };

  const activeItem = NAV_ITEMS.find((item) => item.id === activeNav);
  const displayName = getGreetingName(userEmail, userName);

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
                    variant={isActive ? "secondary" : "ghost"}
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
        </header>

        {/* Main Content Area */}
        <main className="devflow-main">
          {children ||
            (activeNav === "dashboard" && userId ? (
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
                onSelectProject={(projId) => {
                  if (projId) {
                    setNavState({ nav: "projects", projectId: projId });
                    window.history.pushState(null, "", `#projects/${projId}`);
                  } else {
                    setNavState({ nav: "projects", projectId: undefined });
                    window.history.pushState(null, "", `#projects`);
                  }
                }}
              />
            ) : activeNav === "tasks" && userId ? (
              <TasksPage userId={userId} />
            ) : (
              <div className="devflow-placeholder-card">
                <h2>{activeItem?.label}</h2>
                <p>
                  This section is currently under development. Selected tab:{" "}
                  <code>{activeNav}</code>
                </p>
              </div>
            ))}
        </main>
      </div>
    </div>
  );
}
