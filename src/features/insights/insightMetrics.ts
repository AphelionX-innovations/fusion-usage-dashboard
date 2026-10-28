import { identify } from "@/shared/identity";
import type { EvaluationUsage, ModelUsage, PromptUsage, ScoreUsage } from "@/shared/insightTypes";
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

export type ModelTotal = {
  model: string;
  callCount: number;
  totalCost: number;
  errorCount: number;
  inputTokens: number;
  outputTokens: number;
};

export function modelTotals(rows: ModelUsage[], limit = 8): ModelTotal[] {
  const byModel = new Map<string, ModelTotal>();
  for (const row of rows) {
    const model = row.model || "Modèle inconnu";
    const total = byModel.get(model) ?? {
      model,
      callCount: 0,
      totalCost: 0,
      errorCount: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    total.callCount += row.callCount;
    total.totalCost += row.totalCost;
    total.errorCount += row.errorCount;
    total.inputTokens += row.inputTokens;
    total.outputTokens += row.outputTokens;
    byModel.set(model, total);
  }
  return [...byModel.values()].sort((left, right) => right.callCount - left.callCount).slice(0, limit);
}

export type UserCallTotal = {
  name: string;
  userId: string | null;
  callCount: number;
  totalCost: number;
  errorCount: number;
};

export function userCallTotals(rows: ModelUsage[], authNames: Record<string, string>, limit = 8): UserCallTotal[] {
  const byUser = new Map<string, UserCallTotal>();
  for (const row of rows) {
    const identity = identify(row, authNames);
    const total = byUser.get(identity.key) ?? {
      name: identity.name,
      userId: row.userId,
      callCount: 0,
      totalCost: 0,
      errorCount: 0,
    };
    total.callCount += row.callCount;
    total.totalCost += row.totalCost;
    total.errorCount += row.errorCount;
    byUser.set(identity.key, total);
  }
  return [...byUser.values()].filter((row) => row.callCount > 0).sort((left, right) => right.callCount - left.callCount).slice(0, limit);
}

export type PromptTotal = {
  name: string;
  callCount: number;
  totalTokens: number;
  totalCost: number;
  errorCount: number;
};

export function promptTotals(rows: PromptUsage[], limit = 8): PromptTotal[] {
  const byPrompt = new Map<string, PromptTotal>();
  for (const row of rows) {
    const name = row.promptVersion === null ? row.promptName : `${row.promptName} v${row.promptVersion}`;
    const total = byPrompt.get(name) ?? { name, callCount: 0, totalTokens: 0, totalCost: 0, errorCount: 0 };
    total.callCount += row.callCount;
    total.totalTokens += row.totalTokens;
    total.totalCost += row.totalCost;
    total.errorCount += row.errorCount;
    byPrompt.set(name, total);
  }
  return [...byPrompt.values()].filter((row) => row.callCount > 0).sort((left, right) => right.callCount - left.callCount).slice(0, limit);
}

export type ScoreTotal = {
  name: string;
  scoreCount: number;
  avgValue: number | null;
  dataType: string;
};

export function scoreTotals(rows: ScoreUsage[], limit = 8): ScoreTotal[] {
  const byName = new Map<string, ScoreTotal & { weight: number }>();
  for (const row of rows) {
    const total = byName.get(row.name) ?? { name: row.name, scoreCount: 0, avgValue: null, dataType: row.dataType, weight: 0 };
    total.scoreCount += row.scoreCount;
    if (row.avgValue !== null) {
      total.weight += row.scoreCount;
      total.avgValue = (total.avgValue ?? 0) + row.avgValue * row.scoreCount;
    }
    byName.set(row.name, total);
  }
  return [...byName.values()]
    .map((row) => ({
      name: row.name,
      scoreCount: row.scoreCount,
      dataType: row.dataType,
      avgValue: row.weight > 0 && row.avgValue !== null ? row.avgValue / row.weight : null,
    }))
    .filter((row) => row.scoreCount > 0)
    .sort((left, right) => right.scoreCount - left.scoreCount)
    .slice(0, limit);
}

export type EvaluationOutcomes = {
  completed: number;
  errors: number;
  waiting: number;
  cancelled: number;
};

export function evaluationOutcomes(rows: EvaluationUsage[]): EvaluationOutcomes {
  return rows.reduce(
    (sum, row) => ({
      completed: sum.completed + row.completedCount,
      errors: sum.errors + row.errorCount,
      waiting: sum.waiting + row.pendingCount + row.delayedCount,
      cancelled: sum.cancelled + row.cancelledCount,
    }),
    { completed: 0, errors: 0, waiting: 0, cancelled: 0 },
  );
}

export function evaluationWaiting(row: Pick<EvaluationUsage, "pendingCount" | "delayedCount">): number {
  return row.pendingCount + row.delayedCount;
}
