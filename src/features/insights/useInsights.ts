import { useEffect, useState } from "react";
import { ApiError } from "@/shared/api";
import {
  fetchDatasets,
  fetchEvaluations,
  fetchModels,
  fetchPrompts,
  fetchScores,
  fetchTools,
} from "@/shared/insightsApi";
import type {
  DatasetUsage,
  EvaluationUsage,
  ModelUsage,
  PromptUsage,
  ScoreUsage,
  ToolUsage,
} from "@/shared/insightTypes";
import type { Periods } from "@/shared/periods";

export type InsightData = {
  models: ModelUsage[];
  prompts: PromptUsage[];
  tools: ToolUsage[];
  scores: ScoreUsage[];
  evaluations: EvaluationUsage[];
  datasets: DatasetUsage[];
};

const EMPTY: InsightData = { models: [], prompts: [], tools: [], scores: [], evaluations: [], datasets: [] };

const LABELS: Record<keyof InsightData, string> = {
  models: "modèles",
  prompts: "prompts",
  tools: "outils",
  scores: "scores",
  evaluations: "évaluateurs",
  datasets: "datasets",
};

function describe(caught: unknown): string {
  if (caught instanceof ApiError && caught.status === 404 && !caught.code) return "endpoint absent sur ce serveur";
  return caught instanceof Error ? caught.message : "erreur inconnue";
}

export function useInsights(params: {
  token: string;
  periods: Periods | null;
  userId: string | null;
  enabled: boolean;
  refreshKey: number;
  onUnauthorized: () => void;
}) {
  const { token, periods, userId, enabled, refreshKey, onUnauthorized } = params;
  const [data, setData] = useState<InsightData>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!periods || !enabled) return;
    let cancelled = false;
    const request = { token, range: periods.current, userId: userId ?? undefined };
    const keys = Object.keys(LABELS) as (keyof InsightData)[];
    setLoading(true);
    Promise.allSettled([
      fetchModels(request),
      fetchPrompts(request),
      fetchTools(request),
      fetchScores(request),
      fetchEvaluations(request),
      fetchDatasets(request),
    ])
      .then((results) => {
        if (cancelled) return;
        if (results.some((result) => result.status === "rejected" && result.reason instanceof ApiError && result.reason.status === 401)) {
          onUnauthorized();
          return;
        }
        const next = { ...EMPTY } as Record<keyof InsightData, unknown[]>;
        const failures: string[] = [];
        results.forEach((result, index) => {
          const key = keys[index];
          if (result.status === "fulfilled") next[key] = result.value;
          else failures.push(`${LABELS[key]} : ${describe(result.reason)}`);
        });
        setData(next as InsightData);
        setErrors(failures);
        setLoadedAt(new Date());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, periods, userId, enabled, refreshKey, onUnauthorized]);

  return { data, errors, loading, loadedAt };
}
