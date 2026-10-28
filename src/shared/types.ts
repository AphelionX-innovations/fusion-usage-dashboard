export type AuthUser = {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isSuperAdmin?: boolean;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type UsageIdentity = {
  projectId: string;
  tenantId: string | null;
  tenantName: string | null;
  userId: string | null;
  userName: string | null;
};

export type UsageProject = UsageIdentity & {
  traceCount: number;
  lastTraceAt: string | null;
};

export type TraceBucket = {
  bucket: string;
  traceCount: number;
};

export type TimeseriesSubject = {
  userId: string | null;
  userName: string | null;
  tenantId: string | null;
  tenantName: string | null;
};

export type Granularity = "hour" | "day" | "week";

export type UsageRange = {
  from: string;
  to: string;
  environment?: string;
};

export type UsageFeature = "workflow" | "agent";

export type FeatureAdoption = UsageIdentity & {
  workflowTraceCount: number;
  agentTraceCount: number;
  otherTraceCount: number;
  totalTraceCount: number;
  workflowShare: number;
  agentShare: number;
  firstWorkflowAt: string | null;
  lastWorkflowAt: string | null;
  firstAgentAt: string | null;
  lastAgentAt: string | null;
};

export type ObservationTotals = {
  totalCost?: number;
  totalTokens?: number;
  errorCount?: number;
};

export type WorkflowUsage = UsageIdentity &
  ObservationTotals & {
    graphId: string;
    workflowName: string | null;
    traceCount: number;
    uniqueSessions: number;
    avgNodeCount: number | null;
    maxNodeCount: number | null;
    firstUsedAt: string;
    lastUsedAt: string;
  };

export type AgentFlowUsage = UsageIdentity &
  ObservationTotals & {
    flowId: string;
    flowName: string | null;
    runCount: number;
    uniqueSessions: number;
    avgDurationMs: number | null;
    p50DurationMs: number | null;
    p95DurationMs: number | null;
    maxDurationMs: number | null;
    firstUsedAt: string;
    lastUsedAt: string;
  };
