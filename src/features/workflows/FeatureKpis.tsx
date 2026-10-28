import { formatChange, formatCompact, formatCost, formatCount, formatDuration, formatPercent } from "@/shared/format";
import { Kpi } from "@/shared/components/Kpi";
import type { AgentSummary, CostSummary, FeatureSummary } from "./featureMetrics";

type FeatureKpisProps = {
  summary: FeatureSummary;
  agents: AgentSummary;
  workflowCount: number;
  costs: CostSummary;
};

function shareOf(part: number, total: number): string {
  return total > 0 ? formatPercent(part / total) : "—";
}

export function FeatureKpis({ summary, agents, workflowCount, costs }: FeatureKpisProps) {
  return (
    <section className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Kpi
        label="Utilisateurs de workflows"
        value={formatCount(summary.workflowUsers)}
        badge={formatChange(summary.workflowTraces, summary.previousWorkflowTraces)}
        tone="workflow"
        detail={`${shareOf(summary.workflowUsers, summary.usersWithTraces)} des utilisateurs actifs · ${formatCount(summary.workflowTraces)} traces sur ${formatCount(workflowCount)} workflows`}
      />
      <Kpi
        label="Utilisateurs de la plateforme agentique"
        value={formatCount(summary.agentUsers)}
        badge={formatChange(summary.agentTraces, summary.previousAgentTraces)}
        tone="agent"
        detail={`${shareOf(summary.agentUsers, summary.usersWithTraces)} des utilisateurs actifs · ${formatCount(summary.bothUsers)} utilisent aussi les workflows`}
      />
      <Kpi
        label="Exécutions d’agents"
        value={formatCount(agents.runs)}
        tone="agent"
        detail={`${formatCount(agents.flows)} flows · durée moyenne ${formatDuration(agents.avgDurationMs)} · p95 max ${formatDuration(agents.slowestP95Ms)}`}
      />
      <Kpi
        label="Coût workflows et agents"
        value={costs.hasTotals ? formatCost(costs.workflowCost + costs.agentCost) : "—"}
        tone={costs.errorCount > 0 ? "warn" : undefined}
        detail={
          costs.hasTotals
            ? `Workflows ${formatCost(costs.workflowCost)} · agents ${formatCost(costs.agentCost)} · ${formatCompact(costs.totalTokens)} tokens · ${formatCount(costs.errorCount)} erreurs`
            : "Aucune observation rattachée sur la période"
        }
      />
    </section>
  );
}
