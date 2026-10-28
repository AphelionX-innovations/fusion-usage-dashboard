import { identify } from "@/shared/identity";
import type { AgentFlowUsage, FeatureAdoption, ObservationTotals, UsageIdentity, WorkflowUsage } from "@/shared/types";

export const FEATURE_META = {
  workflow: { label: "Workflows", color: "var(--c-workflow)" },
  agent: { label: "Agents", color: "var(--c-agent)" },
  other: { label: "Autres traces", color: "var(--c-other)" },
} as const;

export type FeatureEntity = {
  key: string;
  userId: string | null;
  name: string;
  tenantName: string | null;
  workflowTraceCount: number;
  agentTraceCount: number;
  otherTraceCount: number;
  totalTraceCount: number;
  lastWorkflowAt: string | null;
  lastAgentAt: string | null;
};

export type Owned<T> = T & { ownerKey: string; ownerName: string; ownerTenant: string | null };

function latest(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

export function featureUsage(entity: Pick<FeatureEntity, "workflowTraceCount" | "agentTraceCount">): number {
  return entity.workflowTraceCount + entity.agentTraceCount;
}

export function workflowNodeCount(row: Pick<WorkflowUsage, "avgNodeCount" | "maxNodeCount">): number | null {
  return row.maxNodeCount ?? row.avgNodeCount;
}

export function buildFeatureEntities(
  rows: FeatureAdoption[],
  authNames: Record<string, string>,
): FeatureEntity[] {
  const byKey = new Map<string, FeatureEntity>();
  for (const row of rows) {
    const identity = identify(row, authNames);
    const entity = byKey.get(identity.key) ?? {
      key: identity.key,
      userId: row.userId,
      name: identity.name,
      tenantName: identity.tenantName,
      workflowTraceCount: 0,
      agentTraceCount: 0,
      otherTraceCount: 0,
      totalTraceCount: 0,
      lastWorkflowAt: null,
      lastAgentAt: null,
    };
    entity.workflowTraceCount += row.workflowTraceCount;
    entity.agentTraceCount += row.agentTraceCount;
    entity.otherTraceCount += row.otherTraceCount;
    entity.totalTraceCount += row.totalTraceCount;
    entity.lastWorkflowAt = latest(entity.lastWorkflowAt, row.lastWorkflowAt);
    entity.lastAgentAt = latest(entity.lastAgentAt, row.lastAgentAt);
    byKey.set(identity.key, entity);
  }

  return [...byKey.values()].sort(
    (left, right) =>
      featureUsage(right) - featureUsage(left) ||
      right.totalTraceCount - left.totalTraceCount ||
      left.name.localeCompare(right.name, "fr"),
  );
}

export type FeatureSummary = {
  usersWithTraces: number;
  workflowUsers: number;
  agentUsers: number;
  bothUsers: number;
  workflowTraces: number;
  agentTraces: number;
  totalTraces: number;
  previousWorkflowTraces: number;
  previousAgentTraces: number;
};

export function summarizeFeatures(current: FeatureEntity[], previous: FeatureEntity[]): FeatureSummary {
  const summary: FeatureSummary = {
    usersWithTraces: 0,
    workflowUsers: 0,
    agentUsers: 0,
    bothUsers: 0,
    workflowTraces: 0,
    agentTraces: 0,
    totalTraces: 0,
    previousWorkflowTraces: 0,
    previousAgentTraces: 0,
  };
  for (const entity of current) {
    if (entity.totalTraceCount > 0) summary.usersWithTraces += 1;
    if (entity.workflowTraceCount > 0) summary.workflowUsers += 1;
    if (entity.agentTraceCount > 0) summary.agentUsers += 1;
    if (entity.workflowTraceCount > 0 && entity.agentTraceCount > 0) summary.bothUsers += 1;
    summary.workflowTraces += entity.workflowTraceCount;
    summary.agentTraces += entity.agentTraceCount;
    summary.totalTraces += entity.totalTraceCount;
  }
  for (const entity of previous) {
    summary.previousWorkflowTraces += entity.workflowTraceCount;
    summary.previousAgentTraces += entity.agentTraceCount;
  }
  return summary;
}

export function withOwners<T extends UsageIdentity>(rows: T[], authNames: Record<string, string>): Owned<T>[] {
  return rows.map((row) => {
    const identity = identify(row, authNames);
    return { ...row, ownerKey: identity.key, ownerName: identity.name, ownerTenant: identity.tenantName };
  });
}

export type AgentSummary = {
  runs: number;
  flows: number;
  avgDurationMs: number | null;
  slowestP95Ms: number | null;
};

export function summarizeAgentFlows(rows: AgentFlowUsage[]): AgentSummary {
  let runs = 0;
  let timedRuns = 0;
  let weightedDuration = 0;
  let slowestP95Ms: number | null = null;
  for (const row of rows) {
    runs += row.runCount;
    if (row.avgDurationMs !== null) {
      timedRuns += row.runCount;
      weightedDuration += row.avgDurationMs * row.runCount;
    }
    if (row.p95DurationMs !== null && (slowestP95Ms === null || row.p95DurationMs > slowestP95Ms)) {
      slowestP95Ms = row.p95DurationMs;
    }
  }
  return {
    runs,
    flows: new Set(rows.map((row) => row.flowId)).size,
    avgDurationMs: timedRuns > 0 ? weightedDuration / timedRuns : null,
    slowestP95Ms,
  };
}

export type CostSummary = {
  hasTotals: boolean;
  workflowCost: number;
  agentCost: number;
  totalTokens: number;
  errorCount: number;
};

function addTotals(rows: ObservationTotals[]) {
  return rows.reduce(
    (sum, row) => ({
      cost: sum.cost + (row.totalCost ?? 0),
      tokens: sum.tokens + (row.totalTokens ?? 0),
      errors: sum.errors + (row.errorCount ?? 0),
    }),
    { cost: 0, tokens: 0, errors: 0 },
  );
}

export function summarizeCosts(workflows: WorkflowUsage[], agents: AgentFlowUsage[]): CostSummary {
  const workflow = addTotals(workflows);
  const agent = addTotals(agents);
  return {
    hasTotals: [...workflows, ...agents].some((row) => row.totalCost !== undefined),
    workflowCost: workflow.cost,
    agentCost: agent.cost,
    totalTokens: workflow.tokens + agent.tokens,
    errorCount: workflow.errors + agent.errors,
  };
}
