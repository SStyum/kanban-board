import { BoardPage } from './pages/BoardPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './store/authStore';

export function App() {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const userEmail = useAuthStore((s) => s.user?.email);

  return (
    <main className="app">
      {token ? (
        <>
          <BoardPage />
          <button type="button" className="logout-btn" onClick={logout}>
            {userEmail ? `Sair (${userEmail})` : 'Sair'}
          </button>
        </>
      ) : (
        <LoginPage />
      )}
    </main>
  );
}
