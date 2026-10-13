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

  return (
    <main className="login">
      <section className="login-copy">
        <p className="eyebrow">Fusion · usage</p>
        <h1>Traces par projet</h1>
        <p>
          Connexion via auth-api. Les graphes lisent les routes d’usage de
          Fusion. Seul un super-admin voit les projets et leurs traces.
        </p>
      </section>
      <form className="card login-card" onSubmit={onSubmit}>
        {challengeToken ? (
          <label>
            Code à 6 chiffres
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
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
          {pending ? "Connexion…" : challengeToken ? "Valider le code" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
