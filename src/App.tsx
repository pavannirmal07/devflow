import { lazy, Suspense } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "./features/auth/useAuth";
import { signOut } from "./features/auth/auth";
import { useProfile } from "./features/profile";
import { AppShell } from "./components/layout/AppShell";
import { ThemeProvider } from "./features/theme";

const AuthPage = lazy(() =>
  import("./features/auth/pages/AuthPage").then((module) => ({
    default: module.AuthPage,
  }))
);

function AppLoadingFallback() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground box-border">
      <div className="flex items-center justify-center gap-2.5">
        <Zap className="size-6 text-accent shrink-0 animate-pulse" />
        <span className="font-bold text-xl tracking-tight text-foreground">
          DevFlow
        </span>
      </div>
    </div>
  );
}

function AppContent() {
  const { session, isAuthenticated, loading } = useAuth();
  const { profile } = useProfile(session?.user?.id);

  if (loading) {
    return <AppLoadingFallback />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <AuthPage />
      </Suspense>
    );
  }

  return (
    <AppShell
      userId={session?.user?.id}
      userEmail={session?.user?.email}
      userName={profile?.display_name}
      onSignOut={() => void signOut()}
    />
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;