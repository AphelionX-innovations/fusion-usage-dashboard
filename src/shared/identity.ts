import type { UsageIdentity } from "./types";

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const UNNAMED_KEY = "local:unnamed";

function readableName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || UUID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function identify(project: UsageIdentity, authNames: Record<string, string>) {
  if (project.userId) {
    return {
      key: `auth:${project.userId}`,
      name: readableName(authNames[project.userId]) || readableName(project.userName) || "Utilisateur sans nom",
      tenantName: readableName(project.tenantName),
    };
  }
  const name = readableName(project.userName);
  if (!name) return { key: UNNAMED_KEY, name: "Projets sans nom", tenantName: null };
  return { key: `local:${project.projectId}`, name, tenantName: readableName(project.tenantName) };
}
