import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FEATURE_META, workflowNodeCount, type FeatureEntity } from "@/features/workflows";
import {
  formatBucket,
  formatCompact,
  formatCost,
  formatCount,
  formatDateTime,
  formatDuration,
  formatPercent,
} from "@/shared/format";
import type { AgentFlowUsage, Granularity, TraceBucket, UsageProject, WorkflowUsage } from "@/shared/types";

export type DrawerTrend = { current: TraceBucket[]; workflow: TraceBucket[]; agent: TraceBucket[] };

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };
const MIX_PARTS = ["workflow", "agent", "other"] as const;

export function UsageMix({ feature }: { feature: FeatureEntity | undefined }) {
  const total = feature?.totalTraceCount ?? 0;
  if (!feature || total === 0) {
    return <p className="text-sm text-muted-foreground">Aucune trace de workflow ni d’agent pour ce compte sur la période.</p>;
  }
  const counts = {
    workflow: feature.workflowTraceCount,
    agent: feature.agentTraceCount,
    other: feature.otherTraceCount,
  };
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label="Répartition des traces par type d’usage">
        {MIX_PARTS.map((part) =>
          counts[part] > 0 ? (
            <span key={part} className="h-full" style={{ width: `${(counts[part] / total) * 100}%`, background: FEATURE_META[part].color }} />
          ) : null,
        )}
      </div>
      <ul className="mt-2 grid gap-1">
        {MIX_PARTS.map((part) => (
          <li key={part} className="flex items-center gap-2 text-sm">
            <i className="size-2 shrink-0 rounded-full" style={{ background: FEATURE_META[part].color }} />
            <span className="text-muted-foreground">{FEATURE_META[part].label}</span>
            <b className="ml-auto font-mono font-medium">{formatCount(counts[part])}</b>
            <small className="w-10 text-right text-muted-foreground">{formatPercent(counts[part] / total)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DrawerTrendChart({ trend, granularity }: { trend: DrawerTrend; granularity: Granularity }) {
  const points = trend.current.map((bucket, index) => ({
    label: formatBucket(bucket.bucket, granularity),
    traces: bucket.traceCount,
    workflow: trend.workflow[index]?.traceCount ?? 0,
    agent: trend.agent[index]?.traceCount ?? 0,
  }));
  if (points.every((point) => point.traces === 0)) {
    return <p className="text-sm text-muted-foreground">Aucune trace sur la période.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" minTickGap={24} tick={AXIS_TICK} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} />
        <Tooltip formatter={(value) => formatCount(Number(value))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="traces" name="Toutes les traces" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="workflow" name={FEATURE_META.workflow.label} stroke={FEATURE_META.workflow.color} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="agent" name={FEATURE_META.agent.label} stroke={FEATURE_META.agent.color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function byCount<T>(rows: T[], count: (row: T) => number): T[] {
  return [...rows].sort((left, right) => count(right) - count(left));
}

export function WorkflowList({ rows }: { rows: WorkflowUsage[] }) {
  if (rows.length === 0) return <Empty>Aucun workflow utilisé sur la période.</Empty>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {byCount(rows, (row) => row.traceCount).map((row) => {
        const nodes = workflowNodeCount(row);
        return (
        <li key={`${row.projectId}:${row.graphId}:${row.workflowName}`} className="flex items-start justify-between gap-3 px-3 py-2">
          <span className="min-w-0">
            <strong className="block truncate text-sm font-medium">{row.workflowName || "Workflow sans nom"}</strong>
            <small className="mt-0.5 block text-xs text-muted-foreground">
              {nodes === null ? "Nœuds inconnus" : `${formatCount(nodes)} nœuds`} ·{" "}
              {formatCount(row.uniqueSessions)} sessions · {formatDateTime(row.lastUsedAt)}
            </small>
          </span>
          <b className="shrink-0 text-right font-mono text-sm">
            {formatCount(row.traceCount)}
            <small className="block text-xs font-normal text-muted-foreground">{formatCost(row.totalCost)}</small>
          </b>
        </li>
        );
      })}
    </ul>
  );
}

export function AgentList({ rows }: { rows: AgentFlowUsage[] }) {
  if (rows.length === 0) return <Empty>Aucun flow agentique exécuté sur la période.</Empty>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {byCount(rows, (row) => row.runCount).map((row) => (
        <li key={`${row.projectId}:${row.flowId}:${row.flowName}`} className="flex items-start justify-between gap-3 px-3 py-2">
          <span className="min-w-0">
            <strong className="block truncate text-sm font-medium">{row.flowName || "Flow sans nom"}</strong>
            <small className="mt-0.5 block text-xs text-muted-foreground">
              {formatDuration(row.avgDurationMs)} en moyenne · p95 {formatDuration(row.p95DurationMs)}
              {row.errorCount ? ` · ${formatCount(row.errorCount)} erreurs` : ""}
            </small>
          </span>
          <b className="shrink-0 text-right font-mono text-sm">
            {formatCount(row.runCount)}
            <small className="block text-xs font-normal text-muted-foreground">{formatCost(row.totalCost)}</small>
          </b>
        </li>
      ))}
    </ul>
  );
}

export function ProjectList({ rows }: { rows: UsageProject[] }) {
  if (rows.length === 0) return <Empty>Aucun projet actif sur la période.</Empty>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {byCount(rows, (row) => row.traceCount).map((row) => (
        <li key={row.projectId} className="flex items-start justify-between gap-3 px-3 py-2">
          <span className="min-w-0">
            <code className="block font-mono text-xs break-all">{row.projectId}</code>
            <small className="mt-0.5 block text-xs text-muted-foreground">Dernière trace : {formatDateTime(row.lastTraceAt)}</small>
          </span>
          <b className="shrink-0 font-mono text-sm">{formatCount(row.traceCount)}</b>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function costLine(params: { cost: number; tokens: number; errors: number }) {
  return `${formatCost(params.cost)} · ${formatCompact(params.tokens)} tokens · ${formatCount(params.errors)} erreurs`;
}
