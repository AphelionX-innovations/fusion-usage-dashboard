import { clearSession } from "./session";
import type {
  AuthUser,
  Granularity,
  Session,
  TimeseriesSubject,
  TopUser,
  TraceBucket,
  UsageProject,
  UsageRange,
} from "./types";

const authBase = import.meta.env.VITE_AUTH_API_URL ?? "/auth-api";
const fusionBase = import.meta.env.VITE_FUSION_API_URL ?? "/fusion-api";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type LoginSuccess = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type LoginChallenge = {
  requires2FA: true;
  challengeToken: string;
  expiresIn?: number;
};

export type LoginResult = LoginSuccess | LoginChallenge;

export function isLoginChallenge(result: LoginResult): result is LoginChallenge {
  return "requires2FA" in result && result.requires2FA === true;
}

async function readError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
    code?: string;
  } | null;
  return new ApiError(
    body?.message || body?.error || "La requête a échoué.",
    response.status,
    body?.code,
  );
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${authBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Auth API est injoignable. Vérifie que le serveur tourne sur le port 3001.",
      0,
    );
  }
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export function login(username: string, password: string): Promise<LoginResult> {
  return postJson<LoginResult>("/api/v1/auth/login", {
    username,
    password,
    tokenType: "bearer",
  });
}

export function verifyTwoFactor(
  challengeToken: string,
  code: string,
): Promise<LoginSuccess> {
  return postJson<LoginSuccess>("/api/v1/auth/verify-2fa", {
    challengeToken,
    code,
    tokenType: "bearer",
  });
}

export async function logout(session: Session): Promise<void> {
  try {
    await fetch(`${authBase}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session.user.id,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      }),
    });
  } catch {
    // La session locale est effacée même si auth-api ne répond pas.
  } finally {
    clearSession();
  }
}

function usageQuery(range: UsageRange, extra?: Record<string, string | undefined>) {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

async function getUsage<T>(token: string, path: string, query: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${fusionBase}${path}?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError(
      "Fusion est injoignable. Vérifie que le serveur tourne sur le port 3000.",
      0,
    );
  }
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export async function fetchProjects(
  token: string,
  range: UsageRange,
): Promise<UsageProject[]> {
  const body = await getUsage<{ data: UsageProject[] }>(
    token,
    "/api/auth/usage/projects",
    usageQuery(range),
  );
  return body.data;
}

export async function fetchTimeseries(
  token: string,
  range: UsageRange,
  granularity: Granularity,
  userId?: string,
): Promise<{ subject: TimeseriesSubject | null; data: TraceBucket[] }> {
  const body = await getUsage<TimeseriesSubject & { data: TraceBucket[] }>(
    token,
    "/api/auth/usage/timeseries",
    usageQuery(range, { granularity, userId }),
  );
  const { data, ...subject } = body;
  const hasSubject = userId !== undefined && subject.userId !== undefined;
  return { subject: hasSubject ? subject : null, data };
}

export async function fetchTopUsers(
  token: string,
  range: UsageRange,
  limit: number,
): Promise<TopUser[]> {
  const body = await getUsage<{ data: TopUser[] }>(
    token,
    "/api/auth/usage/top-users",
    usageQuery(range, { limit: String(limit) }),
  );
  return body.data;
}
