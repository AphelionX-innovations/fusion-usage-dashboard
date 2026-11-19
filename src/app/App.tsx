import { useCallback, useState } from "react";
import { DashboardPage } from "@/app/DashboardPage";
import { LoginPage } from "@/features/auth";
import { serviceTokenMode } from "@/shared/api";
import { clearSession, loadSession } from "@/shared/session";
import type { Session } from "@/shared/types";

// Le vrai jeton reste côté serveur (nginx) ; ce Bearer factice est écrasé par le proxy.
const SERVICE_SESSION: Session = {
  accessToken: "service-token",
  refreshToken: "",
  user: { id: "service", username: "service", isSuperAdmin: true },
};

export function App() {
  const [session, setSession] = useState<Session | null>(() =>
    serviceTokenMode ? SERVICE_SESSION : loadSession(),
  );
  const leave = useCallback(() => {
    if (serviceTokenMode) return;
    clearSession();
    setSession(null);
  }, []);

  if (!session) return <LoginPage onSession={setSession} />;
  return <DashboardPage session={session} onLogout={leave} />;
}
