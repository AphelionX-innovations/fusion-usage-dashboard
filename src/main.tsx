import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { DashboardPage } from "./DashboardPage";
import "./index.css";
import { LoginPage } from "./LoginPage";
import { clearSession, loadSession } from "./session";
import type { Session } from "./types";

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const leave = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  if (!session) return <LoginPage onSession={setSession} />;
  return <DashboardPage session={session} onLogout={leave} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
