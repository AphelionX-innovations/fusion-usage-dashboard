import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  EvaluationChart,
  PromptChart,
  ScoreChart,
  TokenChart,
  UserModelChart,
  evaluationOutcomes,
  modelTotals,
  promptTotals,
  scoreTotals,
  userCallTotals,
  type InsightData,
} from "@/features/insights";
import {
  AgentDurationChart,
  FeatureCostChart,
  WorkflowVolumeChart,
  agentDurationTotals,
  summarizeCosts,
  withOwners,
  workflowTotals,
  type FeatureData,
} from "@/features/workflows";

type LoadState = "loading" | "ready" | "error";

function Pending({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

export function PlatformCharts(props: {
  section: "workflows" | "models";
  features: FeatureData;
  featuresState: LoadState;
  insights: InsightData;
  insightsState: LoadState;
  insightErrors: string[];
  authNames: Record<string, string>;
  onSelectUser: (userId: string) => void;
}) {
  const workflows = useMemo(() => withOwners(props.features.workflows, props.authNames), [props.features.workflows, props.authNames]);
  const workflowBars = useMemo(() => workflowTotals(workflows), [workflows]);
  const costs = useMemo(() => summarizeCosts(props.features.workflows, props.features.agents), [props.features.workflows, props.features.agents]);
  const durations = useMemo(() => agentDurationTotals(props.features.agents), [props.features.agents]);
  const models = useMemo(() => modelTotals(props.insights.models), [props.insights.models]);
  const users = useMemo(() => userCallTotals(props.insights.models, props.authNames), [props.insights.models, props.authNames]);
  const prompts = useMemo(() => promptTotals(props.insights.prompts), [props.insights.prompts]);
  const scores = useMemo(() => scoreTotals(props.insights.scores), [props.insights.scores]);
  const outcomes = useMemo(() => evaluationOutcomes(props.insights.evaluations), [props.insights.evaluations]);

  if (props.section === "workflows") {
    if (props.featuresState === "loading") return <Pending label="Chargement des workflows et des agents." />;
    if (props.featuresState === "error") return <Pending label="Workflows et agents indisponibles pour le moment." />;
    return (
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <FeatureCostChart costs={costs} />
        <WorkflowVolumeChart rows={workflowBars} />
        <div className="lg:col-span-2">
          <AgentDurationChart rows={durations} />
        </div>
      </div>
    );
  }

  if (props.insightsState === "loading") return <Pending label="Chargement des modèles, prompts et scores." />;
  if (props.insightsState === "error") return <Pending label="Modèles, prompts et scores indisponibles pour le moment." />;

  return (
    <div className="grid gap-4">
      {props.insightErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>Données partielles. {props.insightErrors.join(" · ")}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <TokenChart rows={models} />
        <UserModelChart rows={users} onSelectUser={props.onSelectUser} />
        <PromptChart rows={prompts} />
        <ScoreChart rows={scores} />
        <div className="lg:col-span-2">
          <EvaluationChart outcomes={outcomes} />
        </div>
      </div>
    </div>
  );
}
