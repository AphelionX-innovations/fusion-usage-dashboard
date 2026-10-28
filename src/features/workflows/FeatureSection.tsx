import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AgentDurationChart, FeatureCostChart, WorkflowVolumeChart } from "./FeatureBreakdownCharts";
import { FeatureAdoptionChart, FeatureTrendChart } from "./FeatureCharts";
import { FeatureKpis } from "./FeatureKpis";
import {
  agentDurationTotals,
  buildFeatureEntities,
  featureUsage,
  summarizeAgentFlows,
  summarizeCosts,
  summarizeFeatures,
  withOwners,
  workflowTotals,
  type FeatureEntity,
} from "./featureMetrics";
import { FeatureTables } from "./FeatureTables";
import { fillSeries, type Periods } from "@/shared/periods";
import type { FeatureData, FeatureSeries } from "./useFeatureUsage";

type FeatureSectionProps = {
  data: FeatureData;
  series: FeatureSeries;
  entities: FeatureEntity[];
  authNames: Record<string, string>;
  periods: Periods | null;
  error: string | null;
  subjectName: string | null;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  period: { from: string; to: string };
};

export function FeatureSection(props: FeatureSectionProps) {
  const { data, series, entities, authNames, periods } = props;
  const previousEntities = useMemo(() => buildFeatureEntities(data.previous, authNames), [data.previous, authNames]);
  const summary = summarizeFeatures(entities, previousEntities);
  const agentSummary = summarizeAgentFlows(data.agents);
  const costs = summarizeCosts(data.workflows, data.agents);
  const workflows = useMemo(() => withOwners(data.workflows, authNames), [data.workflows, authNames]);
  const agents = useMemo(() => withOwners(data.agents, authNames), [data.agents, authNames]);
  const workflowBars = useMemo(() => workflowTotals(workflows), [workflows]);
  const agentDurations = useMemo(() => agentDurationTotals(data.agents), [data.agents]);
  const filled = useMemo(() => {
    if (!periods) return { workflow: [], agent: [] };
    return {
      workflow: fillSeries(series.workflow, periods.from, periods.to, series.granularity),
      agent: fillSeries(series.agent, periods.from, periods.to, series.granularity),
    };
  }, [series, periods]);
  const unused = !props.error && entities.every((entity) => featureUsage(entity) === 0);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {props.error ? (
        <Alert variant="destructive">
          <AlertDescription>{props.error}</AlertDescription>
        </Alert>
      ) : null}
      {unused ? (
        <Alert>
          <AlertDescription>
            Aucune trace de workflow ni d’agent sur cette période. Les workflows sont reconnus par les metadata{" "}
            <code>graphId</code>, <code>workflowName</code> et <code>nodeCount</code> ; les agents par{" "}
            <code>flow_id</code>, <code>flow_name</code>, <code>start_time</code> et <code>end_time</code>.
          </AlertDescription>
        </Alert>
      ) : null}

      <FeatureKpis summary={summary} agents={agentSummary} workflowCount={data.workflows.length} costs={costs} />

      <FeatureTrendChart
        workflow={filled.workflow}
        agent={filled.agent}
        granularity={series.granularity}
        subjectName={props.subjectName}
      />
      <FeatureAdoptionChart entities={entities} onSelectUser={props.onSelectUser} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <FeatureCostChart costs={costs} />
        <WorkflowVolumeChart rows={workflowBars} />
      </div>
      <AgentDurationChart rows={agentDurations} />

      <FeatureTables
        workflows={workflows}
        agents={agents}
        selectedUserId={props.selectedUserId}
        onSelectUser={props.onSelectUser}
        period={props.period}
      />
    </div>
  );
}
