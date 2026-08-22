import { AuthPage } from "./features/auth/pages/AuthPage";
import { useAuth } from "./features/auth/useAuth";
import { supabase } from "./lib/supabase/client";

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <p>Loading DevFlow...</p>;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <main>
      <h1>DevFlow</h1>
      <p>You are authenticated.</p>

      <button onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </main>
  );
}

export default App;