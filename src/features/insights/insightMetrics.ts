import type { EvaluationUsage, ModelUsage } from "@/shared/insightTypes";
import type { InsightData } from "./useInsights";

export type InsightSummary = {
  modelCalls: number;
  modelCount: number;
  totalCost: number;
  totalTokens: number;
  modelErrors: number;
  avgLatencyMs: number | null;
  promptCount: number;
  evaluationRuns: number;
  evaluationErrors: number;
  scoreCount: number;
  datasetCount: number;
  datasetRuns: number;
};

function weightedLatency(rows: ModelUsage[]): number | null {
  let calls = 0;
  let total = 0;
  for (const row of rows) {
    if (row.avgLatencyMs === null) continue;
    calls += row.callCount;
    total += row.avgLatencyMs * row.callCount;
  }
  return calls > 0 ? total / calls : null;
}

function sumBy<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((sum, row) => sum + value(row), 0);
}

export function summarizeInsights(data: InsightData): InsightSummary {
  return {
    modelCalls: sumBy(data.models, (row) => row.callCount),
    modelCount: new Set(data.models.map((row) => row.model ?? "")).size,
    totalCost: sumBy(data.models, (row) => row.totalCost),
    totalTokens: sumBy(data.models, (row) => row.totalTokens),
    modelErrors: sumBy(data.models, (row) => row.errorCount),
    avgLatencyMs: weightedLatency(data.models),
    promptCount: new Set(data.prompts.map((row) => `${row.promptName}:${row.promptVersion ?? ""}`)).size,
    evaluationRuns: sumBy(data.evaluations, (row) => row.executionCount),
    evaluationErrors: sumBy(data.evaluations, (row) => row.errorCount),
    scoreCount: sumBy(data.scores, (row) => row.scoreCount),
    datasetCount: data.datasets.length,
    datasetRuns: sumBy(data.datasets, (row) => row.runCount),
  };
}

export type ModelTotal = { model: string; callCount: number; totalCost: number; errorCount: number };

export function modelTotals(rows: ModelUsage[], limit = 8): ModelTotal[] {
  const byModel = new Map<string, ModelTotal>();
  for (const row of rows) {
    const model = row.model || "Modèle inconnu";
    const total = byModel.get(model) ?? { model, callCount: 0, totalCost: 0, errorCount: 0 };
    total.callCount += row.callCount;
    total.totalCost += row.totalCost;
    total.errorCount += row.errorCount;
    byModel.set(model, total);
  }
  return [...byModel.values()].sort((left, right) => right.callCount - left.callCount).slice(0, limit);
}

export function evaluationWaiting(row: Pick<EvaluationUsage, "pendingCount" | "delayedCount">): number {
  return row.pendingCount + row.delayedCount;
}
