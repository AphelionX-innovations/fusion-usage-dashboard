import { identify, UNNAMED_KEY } from "@/shared/identity";
import type { UsageProject } from "@/shared/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_MS = 7 * DAY_MS;
const DECLINE_RATIO = 0.5;
const TOP_SIZE = 5;

export type EntityStatus = "active" | "slowing" | "stopped" | "dormant";

export const STATUS_META: Record<EntityStatus, { label: string; hint: string; color: string }> = {
  active: { label: "Actif", hint: "trace dans les 7 derniers jours", color: "var(--s-active)" },
  slowing: { label: "Ralenti", hint: "aucune trace depuis plus de 7 jours", color: "var(--s-slowing)" },
  stopped: { label: "Arrêté", hint: "actif avant, plus rien sur la période", color: "var(--s-stopped)" },
  dormant: { label: "Dormant", hint: "aucune trace sur les deux périodes", color: "var(--s-dormant)" },
};

export type UsageEntity = {
  key: string;
  source: "auth" | "local";
  userId: string | null;
  name: string;
  tenantName: string | null;
  traceCount: number;
  previousCount: number;
  lastTraceAt: string | null;
  projectCount: number;
  status: EntityStatus;
  share: number;
};

type Draft = Omit<UsageEntity, "status" | "share">;

function addProjects(params: {
  drafts: Map<string, Draft>;
  projects: UsageProject[];
  authNames: Record<string, string>;
  period: "current" | "previous";
}) {
  for (const project of params.projects) {
    const identity = identify(project, params.authNames);
    let draft = params.drafts.get(identity.key);
    if (!draft) {
      draft = {
        key: identity.key,
        source: project.userId ? "auth" : "local",
        userId: project.userId,
        name: identity.name,
        tenantName: identity.tenantName,
        traceCount: 0,
        previousCount: 0,
        lastTraceAt: null,
        projectCount: 0,
      };
      params.drafts.set(identity.key, draft);
    }

    if (params.period === "previous") {
      draft.previousCount += project.traceCount;
      continue;
    }

    draft.traceCount += project.traceCount;
    draft.projectCount += 1;
    if (identity.key !== UNNAMED_KEY) draft.tenantName ??= identity.tenantName;
    if (project.lastTraceAt && (!draft.lastTraceAt || project.lastTraceAt > draft.lastTraceAt)) {
      draft.lastTraceAt = project.lastTraceAt;
    }
  }
}

function statusOf(draft: Draft, windowEnd: Date): EntityStatus {
  if (draft.traceCount === 0) return draft.previousCount > 0 ? "stopped" : "dormant";
  const last = draft.lastTraceAt ? new Date(draft.lastTraceAt).getTime() : 0;
  return windowEnd.getTime() - last <= RECENT_MS ? "active" : "slowing";
}

function byUsage(left: UsageEntity, right: UsageEntity): number {
  return (
    right.traceCount - left.traceCount ||
    right.previousCount - left.previousCount ||
    left.name.localeCompare(right.name, "fr")
  );
}

export function buildEntities(params: {
  current: UsageProject[];
  previous: UsageProject[];
  authNames: Record<string, string>;
  windowEnd: Date;
}): UsageEntity[] {
  const drafts = new Map<string, Draft>();
  addProjects({ drafts, projects: params.current, authNames: params.authNames, period: "current" });
  addProjects({ drafts, projects: params.previous, authNames: params.authNames, period: "previous" });

  const values = [...drafts.values()];
  const total = values.reduce((sum, draft) => sum + draft.traceCount, 0);
  return values
    .map((draft) => ({
      ...draft,
      status: statusOf(draft, params.windowEnd),
      share: total > 0 ? draft.traceCount / total : 0,
    }))
    .sort(byUsage);
}

export function isDeclining(entity: UsageEntity): boolean {
  return entity.previousCount > 0 && entity.traceCount <= entity.previousCount * DECLINE_RATIO;
}

export type UsageSummary = {
  total: number;
  previousTotal: number;
  dailyAverage: number;
  authUsers: number;
  activeAuthUsers: number;
  topShare: number | null;
  watchCount: number;
  statusCounts: Record<EntityStatus, number>;
};

export function summarize(entities: UsageEntity[], days: number): UsageSummary {
  const statusCounts: Record<EntityStatus, number> = { active: 0, slowing: 0, stopped: 0, dormant: 0 };
  let total = 0;
  let previousTotal = 0;
  let authUsers = 0;
  let activeAuthUsers = 0;
  let watchCount = 0;

  for (const entity of entities) {
    statusCounts[entity.status] += 1;
    total += entity.traceCount;
    previousTotal += entity.previousCount;
    if (entity.source === "auth") {
      authUsers += 1;
      if (entity.traceCount > 0) activeAuthUsers += 1;
    }
    if (isDeclining(entity)) watchCount += 1;
  }

  const topTotal = entities.slice(0, TOP_SIZE).reduce((sum, entity) => sum + entity.traceCount, 0);
  return {
    total,
    previousTotal,
    dailyAverage: Math.round((total / days) * 10) / 10,
    authUsers,
    activeAuthUsers,
    topShare: total > 0 ? topTotal / total : null,
    watchCount,
    statusCounts,
  };
}

export function tenantBreakdown(
  entities: UsageEntity[],
  limit = 8,
): { name: string; traceCount: number; previousCount: number }[] {
  const byTenant = new Map<string, { name: string; traceCount: number; previousCount: number }>();
  for (const entity of entities) {
    const name = entity.tenantName || "Sans tenant";
    const row = byTenant.get(name) ?? { name, traceCount: 0, previousCount: 0 };
    row.traceCount += entity.traceCount;
    row.previousCount += entity.previousCount;
    byTenant.set(name, row);
  }

  const rows = [...byTenant.values()]
    .filter((row) => row.traceCount > 0)
    .sort((left, right) => right.traceCount - left.traceCount);
  if (rows.length <= limit) return rows;

  const rest = rows.slice(limit - 1).reduce(
    (sum, row) => ({
      name: "Autres",
      traceCount: sum.traceCount + row.traceCount,
      previousCount: sum.previousCount + row.previousCount,
    }),
    { name: "Autres", traceCount: 0, previousCount: 0 },
  );
  return [...rows.slice(0, limit - 1), rest];
}

export function usageSignals(entities: UsageEntity[]) {
  return {
    declining: entities
      .filter(isDeclining)
      .sort((left, right) => right.previousCount - right.traceCount - (left.previousCount - left.traceCount)),
    fresh: entities.filter((entity) => entity.previousCount === 0 && entity.traceCount > 0),
    unusedAuth: entities.filter(
      (entity) => entity.source === "auth" && entity.traceCount === 0 && entity.previousCount === 0,
    ),
  };
}
