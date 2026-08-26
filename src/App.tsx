import { Zap } from "lucide-react";
import { AuthPage } from "./features/auth/pages/AuthPage";
import { useAuth } from "./features/auth/useAuth";
import { signOut } from "./features/auth/auth";
import { useProfile } from "./features/profile";
import { AppShell } from "./components/layout/AppShell";
import { ThemeProvider } from "./features/theme";

function AppContent() {
  const { session, isAuthenticated, loading } = useAuth();
  const { profile } = useProfile(session?.user?.id);

  if (loading) {
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

  if (!isAuthenticated) {
    return <AuthPage />;
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