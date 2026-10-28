import { clearSession } from "./session";
import type {
  AgentFlowUsage,
  AuthUser,
  FeatureAdoption,
  Granularity,
  Session,
  TimeseriesSubject,
  TraceBucket,
  UsageFeature,
  UsageProject,
  UsageRange,
  WorkflowUsage,
} from "./types";

function apiBase(runtimeValue: string | undefined, buildValue: string | undefined, fallback: string) {
  const value = (runtimeValue || buildValue || fallback).trim().replace(/\/+$/, "");
  return value || fallback;
}

const runtime = window.__APP_CONFIG__;
const authBase = apiBase(runtime?.VITE_AUTH_API_URL, import.meta.env.VITE_AUTH_API_URL, "/auth-api");
const fusionBase = apiBase(
  runtime?.VITE_FUSION_API_URL,
  import.meta.env.VITE_FUSION_API_URL,
  "/fusion-api",
);

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
  feature?: UsageFeature,
): Promise<{ subject: TimeseriesSubject | null; data: TraceBucket[] }> {
  const body = await getUsage<TimeseriesSubject & { data: TraceBucket[] }>(
    token,
    "/api/auth/usage/timeseries",
    usageQuery(range, { granularity, userId, feature }),
  );
  const { data, ...subject } = body;
  const hasSubject = userId !== undefined && subject.userId !== undefined;
  return { subject: hasSubject ? subject : null, data };
}

export async function fetchAdoption(token: string, range: UsageRange): Promise<FeatureAdoption[]> {
  const body = await getUsage<{ data: FeatureAdoption[] }>(
    token,
    "/api/auth/usage/adoption",
    usageQuery(range),
  );
  return body.data;
}

export async function fetchWorkflows(token: string, range: UsageRange): Promise<WorkflowUsage[]> {
  const body = await getUsage<{ data: WorkflowUsage[] }>(
    token,
    "/api/auth/usage/workflows",
    usageQuery(range, { include: "observations" }),
  );
  return body.data;
}

export async function fetchAgentFlows(token: string, range: UsageRange): Promise<AgentFlowUsage[]> {
  const body = await getUsage<{ data: AgentFlowUsage[] }>(
    token,
    "/api/auth/usage/agent-flows",
    usageQuery(range, { include: "observations" }),
  );
  return body.data;
}

type AuthNameRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export async function fetchAuthNames(
  token: string,
  ids: string[],
): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    let response: Response;
    try {
      response = await fetch(`${authBase}/api/v1/users/by-ids`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: chunk }),
      });
    } catch {
      return names;
    }
    if (!response.ok) return names;
    const rows = (await response.json()) as AuthNameRow[];
    for (const row of rows) {
      const full = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
      names[row.id] = full || row.email || "";
    }
  }
  return names;
}
