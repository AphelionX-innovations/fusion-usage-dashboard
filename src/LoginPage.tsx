import { useState, type FormEvent } from "react";
import { ApiError, isLoginChallenge, login, verifyTwoFactor } from "./api";
import { saveSession } from "./session";
import type { Session } from "./types";

type LoginPageProps = {
  onSession: (session: Session) => void;
};

export function LoginPage({ onSession }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function openSession(result: {
    accessToken: string;
    refreshToken: string;
    user: Session["user"];
  }) {
    const session: Session = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
    saveSession(session);
    onSession(session);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (challengeToken) {
        openSession(await verifyTwoFactor(challengeToken, code.trim()));
        return;
      }
      const result = await login(username.trim(), password);
      if (isLoginChallenge(result)) {
        setChallengeToken(result.challengeToken);
        return;
      }
      openSession(result);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  }

  function backToPassword() {
    setChallengeToken(null);
    setCode("");
    setError(null);
  }

  return (
    <main className="login">
      <form className="login-panel" onSubmit={onSubmit}>
        <header className="login-brand">
          <span className="login-mark" aria-hidden="true">
            F
          </span>
          <div>
            <strong>Fusion</strong>
            <span>Usage</span>
          </div>
        </header>
        <h1>{challengeToken ? "Vérification" : "Connexion"}</h1>
        <p className="login-lead">
          {challengeToken
            ? "Entre le code à 6 chiffres de ce compte."
            : "Accès réservé aux comptes super-admin."}
        </p>
        {challengeToken ? (
          <label>
            Code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              autoFocus
            />
          </label>
        ) : (
          <>
            <label>
              Email ou nom d’utilisateur
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </>
        )}
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? "Connexion…" : challengeToken ? "Valider" : "Se connecter"}
        </button>
        {challengeToken ? (
          <button type="button" className="login-back" onClick={backToPassword}>
            Utiliser un autre compte
          </button>
        ) : null}
      </form>
    </main>
  );
}
