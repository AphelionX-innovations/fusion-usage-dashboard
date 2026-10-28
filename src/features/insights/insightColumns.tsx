import { Badge } from "@/components/ui/badge";
import type { Owned } from "@/features/workflows";
import { errorCount, ownerCell, type DataColumn } from "@/shared/components/DataTable";
import type { CsvColumn } from "@/shared/csv";
import { formatCompact, formatCost, formatCount, formatDateTime, formatDuration } from "@/shared/format";
import type {
  DatasetUsage,
  EvaluationUsage,
  ModelUsage,
  PromptUsage,
  ScoreUsage,
  ToolUsage,
} from "@/shared/insightTypes";
import { evaluationWaiting } from "./insightMetrics";

type OwnedRow = Owned<{ userId: string | null; projectId: string }>;

function formatValue(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

function titled(title: string, detail?: string | null) {
  return (
    <>
      <span className="block font-medium">{title}</span>
      {detail ? <code className="mt-1 block max-w-64 truncate text-xs text-muted-foreground">{detail}</code> : null}
    </>
  );
}

const OWNER_HEADER = "Utilisateur";

function ownerColumns<T extends OwnedRow>(): DataColumn<T>[] {
  return [{ header: OWNER_HEADER, render: ownerCell }];
}

export function csvColumns<T extends OwnedRow>(columns: DataColumn<T>[]): CsvColumn<T>[] {
  return columns.flatMap((column): CsvColumn<T>[] => {
    if (column.header !== OWNER_HEADER) {
      return column.csv ? [{ header: column.header, value: column.csv }] : [];
    }
    return [
      { header: OWNER_HEADER, value: (row) => row.ownerName },
      { header: "User ID", value: (row) => row.userId },
      { header: "Tenant", value: (row) => row.ownerTenant },
      { header: "Projet", value: (row) => row.projectId },
    ];
  });
}

const lastUsed = <T extends { lastUsedAt: string | null }>(): DataColumn<T> => ({
  header: "Dernier usage",
  render: (row) => formatDateTime(row.lastUsedAt),
  csv: (row) => row.lastUsedAt,
});

export const MODEL_COLUMNS: DataColumn<Owned<ModelUsage>>[] = [
  { header: "Modèle", render: (row) => titled(row.model || "Modèle inconnu"), csv: (row) => row.model },
  ...ownerColumns<Owned<ModelUsage>>(),
  { header: "Appels", numeric: true, render: (row) => formatCount(row.callCount), csv: (row) => row.callCount },
  { header: "Tokens entrée", numeric: true, muted: true, render: (row) => formatCompact(row.inputTokens), csv: (row) => row.inputTokens },
  { header: "Tokens sortie", numeric: true, muted: true, render: (row) => formatCompact(row.outputTokens), csv: (row) => row.outputTokens },
  { header: "Coût", numeric: true, render: (row) => formatCost(row.totalCost), csv: (row) => row.totalCost },
  { header: "Erreurs", numeric: true, render: (row) => errorCount(row.errorCount), csv: (row) => row.errorCount },
  { header: "Latence moy.", numeric: true, render: (row) => formatDuration(row.avgLatencyMs), csv: (row) => row.avgLatencyMs },
  { header: "p95", numeric: true, muted: true, render: (row) => formatDuration(row.p95LatencyMs), csv: (row) => row.p95LatencyMs },
  { header: "1er token", numeric: true, muted: true, render: (row) => formatDuration(row.avgTimeToFirstTokenMs), csv: (row) => row.avgTimeToFirstTokenMs },
  lastUsed(),
];

export const PROMPT_COLUMNS: DataColumn<Owned<PromptUsage>>[] = [
  {
    header: "Prompt",
    render: (row) => titled(row.promptName, row.promptVersion === null ? null : `version ${row.promptVersion}`),
    csv: (row) => `${row.promptName}${row.promptVersion === null ? "" : ` v${row.promptVersion}`}`,
  },
  ...ownerColumns<Owned<PromptUsage>>(),
  { header: "Appels", numeric: true, render: (row) => formatCount(row.callCount), csv: (row) => row.callCount },
  { header: "Traces", numeric: true, muted: true, render: (row) => formatCount(row.traceCount), csv: (row) => row.traceCount },
  { header: "Tokens", numeric: true, render: (row) => formatCompact(row.totalTokens), csv: (row) => row.totalTokens },
  { header: "Coût", numeric: true, render: (row) => formatCost(row.totalCost), csv: (row) => row.totalCost },
  { header: "Erreurs", numeric: true, render: (row) => errorCount(row.errorCount), csv: (row) => row.errorCount },
  { header: "Latence moy.", numeric: true, render: (row) => formatDuration(row.avgLatencyMs), csv: (row) => row.avgLatencyMs },
  lastUsed(),
];

export const TOOL_COLUMNS: DataColumn<Owned<ToolUsage>>[] = [
  { header: "Outil", render: (row) => titled(row.toolName), csv: (row) => row.toolName },
  ...ownerColumns<Owned<ToolUsage>>(),
  { header: "Demandés", numeric: true, render: (row) => formatCount(row.requestedCount), csv: (row) => row.requestedCount },
  { header: "Exécutés", numeric: true, render: (row) => formatCount(row.executionCount), csv: (row) => row.executionCount },
  { header: "Erreurs", numeric: true, render: (row) => errorCount(row.errorCount), csv: (row) => row.errorCount },
  { header: "Durée moy.", numeric: true, render: (row) => formatDuration(row.avgDurationMs), csv: (row) => row.avgDurationMs },
  lastUsed(),
];

export const SCORE_COLUMNS: DataColumn<Owned<ScoreUsage>>[] = [
  { header: "Score", render: (row) => titled(row.name, `${row.source} · ${row.dataType}`), csv: (row) => row.name },
  ...ownerColumns<Owned<ScoreUsage>>(),
  { header: "Nombre", numeric: true, render: (row) => formatCount(row.scoreCount), csv: (row) => row.scoreCount },
  { header: "Moyenne", numeric: true, render: (row) => formatValue(row.avgValue), csv: (row) => row.avgValue },
  {
    header: "Min – max",
    numeric: true,
    muted: true,
    render: (row) => (row.minValue === null ? "—" : `${formatValue(row.minValue)} – ${formatValue(row.maxValue)}`),
    csv: (row) => (row.minValue === null ? null : `${row.minValue} – ${row.maxValue}`),
  },
  {
    header: "Valeurs fréquentes",
    render: (row) => (row.topValues.length ? row.topValues.join(", ") : "—"),
    csv: (row) => row.topValues.join(", "),
  },
  lastUsed(),
];

export const EVALUATION_COLUMNS: DataColumn<Owned<EvaluationUsage>>[] = [
  { header: "Évaluateur", render: (row) => titled(row.scoreName, row.templateName), csv: (row) => row.scoreName },
  ...ownerColumns<Owned<EvaluationUsage>>(),
  {
    header: "Statut",
    render: (row) => <Badge variant={row.evaluatorStatus === "ACTIVE" ? "default" : "outline"}>{row.evaluatorStatus}</Badge>,
    csv: (row) => row.evaluatorStatus,
  },
  { header: "Exécutions", numeric: true, render: (row) => formatCount(row.executionCount), csv: (row) => row.executionCount },
  { header: "Réussies", numeric: true, muted: true, render: (row) => formatCount(row.completedCount), csv: (row) => row.completedCount },
  { header: "Erreurs", numeric: true, render: (row) => errorCount(row.errorCount), csv: (row) => row.errorCount },
  { header: "En attente", numeric: true, muted: true, render: (row) => formatCount(evaluationWaiting(row)), csv: evaluationWaiting },
  { header: "Durée moy.", numeric: true, render: (row) => formatDuration(row.avgDurationMs), csv: (row) => row.avgDurationMs },
  lastUsed(),
];

export const DATASET_COLUMNS: DataColumn<Owned<DatasetUsage>>[] = [
  { header: "Dataset", render: (row) => titled(row.name), csv: (row) => row.name },
  ...ownerColumns<Owned<DatasetUsage>>(),
  { header: "Items actifs", numeric: true, render: (row) => formatCount(row.itemCount), csv: (row) => row.itemCount },
  { header: "Runs", numeric: true, render: (row) => formatCount(row.runCount), csv: (row) => row.runCount },
  { header: "Créé le", render: (row) => formatDateTime(row.createdAt), csv: (row) => row.createdAt },
  { ...lastUsed<Owned<DatasetUsage>>(), header: "Dernier run" },
];
