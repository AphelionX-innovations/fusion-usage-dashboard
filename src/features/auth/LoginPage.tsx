import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, isLoginChallenge, login, verifyTwoFactor } from "@/shared/api";
import { saveSession } from "@/shared/session";
import type { Session } from "@/shared/types";

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
    <div className="dark">
    <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Fusion / Usage</p>
          <CardTitle className="font-heading text-2xl">{challengeToken ? "Vérification" : "Connexion"}</CardTitle>
          <CardDescription>
            {challengeToken
              ? "Entre le code à 6 chiffres de ce compte."
              : "Accès réservé aux comptes super-admin."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            {challengeToken ? (
              <div className="grid gap-2">
                <Label htmlFor="otp">Code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  autoFocus
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="username">Email ou nom d’utilisateur</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </>
            )}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Connexion…" : challengeToken ? "Valider" : "Se connecter"}
            </Button>
            {challengeToken ? (
              <Button type="button" variant="link" className="justify-self-start px-0" onClick={backToPassword}>
                Utiliser un autre compte
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </main>
    </div>
  );
}
