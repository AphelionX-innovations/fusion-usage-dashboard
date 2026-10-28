import type { UsageIdentity } from "./types";

export type EnvironmentUsage = {
  environment: string;
  internal: boolean;
  traceCount: number;
  projectCount: number;
  lastTraceAt: string;
};

export type ModelUsage = UsageIdentity & {
  model: string | null;
  callCount: number;
  traceCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  errorCount: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  avgTimeToFirstTokenMs: number | null;
  firstUsedAt: string;
  lastUsedAt: string;
};

export type PromptUsage = UsageIdentity & {
  promptName: string;
  promptVersion: number | null;
  callCount: number;
  traceCount: number;
  totalTokens: number;
  totalCost: number;
  errorCount: number;
  avgLatencyMs: number | null;
  firstUsedAt: string;
  lastUsedAt: string;
};

export type ToolUsage = UsageIdentity & {
  toolName: string;
  requestedCount: number;
  executionCount: number;
  errorCount: number;
  avgDurationMs: number | null;
  lastUsedAt: string;
};

export type ScoreUsage = UsageIdentity & {
  name: string;
  source: string;
  dataType: string;
  scoreCount: number;
  avgValue: number | null;
  minValue: number | null;
  maxValue: number | null;
  topValues: string[];
  lastUsedAt: string;
};

export type EvaluationUsage = UsageIdentity & {
  evaluatorId: string;
  scoreName: string;
  templateName: string | null;
  evaluatorStatus: string;
  executionCount: number;
  completedCount: number;
  errorCount: number;
  pendingCount: number;
  delayedCount: number;
  cancelledCount: number;
  avgDurationMs: number | null;
  lastUsedAt: string;
};

export type DatasetUsage = UsageIdentity & {
  datasetId: string;
  name: string;
  createdAt: string;
  itemCount: number;
  runCount: number;
  lastUsedAt: string | null;
};

export type ActivityItem = UsageIdentity & {
  id: string;
  createdAt: string;
  actorType: "USER" | "API_KEY";
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  apiKeyId: string | null;
  resourceType: string;
  resourceId: string;
  action: string;
};

export type ActivitySummaryRow = {
  resourceType: string;
  action: string;
  count: number;
};

export type ActivityResult = {
  data: ActivityItem[];
  summary: ActivitySummaryRow[];
  total: number;
};

export type ActivityQuery = {
  resourceType?: string;
  action?: string;
  limit?: number;
};
