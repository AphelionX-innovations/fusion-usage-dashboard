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

export type UsageProject = {
  projectId: string;
  tenantId: string | null;
  tenantName: string | null;
  userId: string | null;
  userName: string | null;
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
};
