import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Kpi } from "@/shared/components/Kpi";
import { formatCompact, formatCost, formatCount, formatDuration, formatPercent } from "@/shared/format";
import { modelTotals, summarizeInsights } from "./insightMetrics";
import { InsightTables } from "./InsightTables";
import { ModelChart } from "./ModelChart";
import type { InsightData } from "./useInsights";

type InsightSectionProps = {
  data: InsightData;
  errors: string[];
  authNames: Record<string, string>;
  environment: string | null;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  period: { from: string; to: string };
};

export function InsightSection(props: InsightSectionProps) {
  const { data } = props;
  const summary = summarizeInsights(data);
  const models = useMemo(() => modelTotals(data.models), [data.models]);
  const errorRate = summary.modelCalls > 0 ? summary.modelErrors / summary.modelCalls : 0;
  const evalErrorRate = summary.evaluationRuns > 0 ? summary.evaluationErrors / summary.evaluationRuns : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {props.errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>Données partielles. {props.errors.join(" · ")}</AlertDescription>
        </Alert>
      ) : null}
      {props.environment ? null : (
        <Alert>
          <AlertDescription>
            Tous les environnements sont inclus, y compris les évaluations automatiques (<code>langfuse-*</code>). Choisis
            un environnement dans les filtres pour ne garder que l’usage réel.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Appels LLM"
          value={formatCompact(summary.modelCalls)}
          detail={`${formatCount(summary.modelCount)} modèles · latence moy. ${formatDuration(summary.avgLatencyMs)}`}
          badge={summary.modelErrors > 0 ? `${formatPercent(errorRate)} erreurs` : undefined}
          tone={summary.modelErrors > 0 ? "warn" : "good"}
        />
        <Kpi
          label="Coût"
          value={formatCost(summary.totalCost)}
          detail={`${formatCompact(summary.totalTokens)} tokens consommés`}
        />
        <Kpi
          label="Évaluations"
          value={formatCompact(summary.evaluationRuns)}
          detail={`${formatCompact(summary.scoreCount)} scores produits`}
          badge={summary.evaluationErrors > 0 ? `${formatPercent(evalErrorRate)} erreurs` : undefined}
          tone={summary.evaluationErrors > 0 ? "warn" : "good"}
        />
        <Kpi
          label="Prompts et datasets"
          value={formatCount(summary.promptCount)}
          detail={`prompts versionnés · ${formatCount(summary.datasetCount)} datasets, ${formatCount(summary.datasetRuns)} runs`}
        />
      </div>

      <ModelChart rows={models} />

      <InsightTables
        data={data}
        authNames={props.authNames}
        selectedUserId={props.selectedUserId}
        onSelectUser={props.onSelectUser}
        period={props.period}
      />
    </div>
  );
}
