import { useCallback, useState } from "react";
import { DashboardPage } from "@/app/DashboardPage";
import { LoginPage } from "@/features/auth";
import { clearSession, loadSession } from "@/shared/session";
import type { Session } from "@/shared/types";

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const leave = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  if (!session) return <LoginPage onSession={setSession} />;
  return <DashboardPage session={session} onLogout={leave} />;
}
