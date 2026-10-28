import { getUsage, usageQuery } from "./api";
import type {
  ActivityQuery,
  ActivityResult,
  DatasetUsage,
  EnvironmentUsage,
  EvaluationUsage,
  ModelUsage,
  PromptUsage,
  ScoreUsage,
  ToolUsage,
} from "./insightTypes";
import type { UsageRange } from "./types";

type InsightRequest = {
  token: string;
  range: UsageRange;
  userId?: string;
};

async function fetchInsight<T>(path: string, request: InsightRequest): Promise<T[]> {
  const body = await getUsage<{ data: T[] }>(
    request.token,
    `/api/auth/usage/${path}`,
    usageQuery(request.range, { userId: request.userId }),
  );
  return body.data;
}

export function fetchEnvironments(token: string, range: UsageRange): Promise<EnvironmentUsage[]> {
  return fetchInsight("environments", { token, range: { from: range.from, to: range.to } });
}

export function fetchModels(request: InsightRequest): Promise<ModelUsage[]> {
  return fetchInsight("models", request);
}

export function fetchPrompts(request: InsightRequest): Promise<PromptUsage[]> {
  return fetchInsight("prompts", request);
}

export function fetchTools(request: InsightRequest): Promise<ToolUsage[]> {
  return fetchInsight("tools", request);
}

export function fetchScores(request: InsightRequest): Promise<ScoreUsage[]> {
  return fetchInsight("scores", request);
}

export function fetchEvaluations(request: InsightRequest): Promise<EvaluationUsage[]> {
  return fetchInsight("evaluations", request);
}

export function fetchDatasets(request: InsightRequest): Promise<DatasetUsage[]> {
  return fetchInsight("datasets", request);
}

export function fetchActivity(request: InsightRequest & { filter: ActivityQuery }): Promise<ActivityResult> {
  const { filter } = request;
  return getUsage<ActivityResult>(
    request.token,
    "/api/auth/usage/activity",
    usageQuery(request.range, {
      userId: request.userId,
      resourceType: filter.resourceType,
      action: filter.action,
      limit: filter.limit ? String(filter.limit) : undefined,
    }),
  );
}
