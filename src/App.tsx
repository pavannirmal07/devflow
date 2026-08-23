import { AuthPage } from "./features/auth/pages/AuthPage";
import { useAuth } from "./features/auth/useAuth";
import { signOut } from "./features/auth/auth";
import { useProfile } from "./features/profile";
import { AppShell } from "./components/layout/AppShell";

function App() {
  const { session, isAuthenticated, loading } = useAuth();
  const { profile } = useProfile(session?.user?.id);

  if (loading) {
    return <p>Loading DevFlow...</p>;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <AppShell
      userEmail={session?.user?.email}
      userName={profile?.display_name}
      onSignOut={() => void signOut()}
    />
  );
}

export default App;