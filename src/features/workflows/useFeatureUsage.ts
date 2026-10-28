import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchAdoption, fetchAgentFlows, fetchTimeseries, fetchWorkflows } from "@/shared/api";
import type { Periods } from "@/shared/periods";
import type { AgentFlowUsage, FeatureAdoption, Granularity, TraceBucket, WorkflowUsage } from "@/shared/types";

export type FeatureData = {
  current: FeatureAdoption[];
  previous: FeatureAdoption[];
  workflows: WorkflowUsage[];
  agents: AgentFlowUsage[];
};

export type FeatureSeries = {
  granularity: Granularity;
  workflow: TraceBucket[];
  agent: TraceBucket[];
};

const EMPTY_DATA: FeatureData = { current: [], previous: [], workflows: [], agents: [] };
const EMPTY_SERIES: FeatureSeries = { granularity: "day", workflow: [], agent: [] };

export function useFeatureUsage(params: {
  token: string;
  periods: Periods | null;
  granularity: Granularity;
  userId: string | null;
  refreshKey: number;
  onUnauthorized: () => void;
}) {
  const { token, periods, granularity, userId, refreshKey, onUnauthorized } = params;
  const [data, setData] = useState<FeatureData>(EMPTY_DATA);
  const [series, setSeries] = useState<FeatureSeries>(EMPTY_SERIES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const fail = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized();
        return;
      }
      if (caught instanceof ApiError && caught.status === 404) {
        setError("Les endpoints workflows et agents ne sont pas encore déployés sur ce serveur Fusion.");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Chargement des workflows et agents impossible.");
    },
    [onUnauthorized],
  );

  useEffect(() => {
    if (!periods) return;
    let cancelled = false;
    setLoading((count) => count + 1);
    Promise.all([
      fetchAdoption(token, periods.current),
      fetchAdoption(token, periods.previous),
      fetchWorkflows(token, periods.current),
      fetchAgentFlows(token, periods.current),
    ])
      .then(([current, previous, workflows, agents]) => {
        if (cancelled) return;
        setData({ current, previous, workflows, agents });
        setError(null);
        setLoadedAt(new Date());
      })
      .catch((caught) => {
        if (!cancelled) fail(caught);
      })
      .finally(() => setLoading((count) => count - 1));
    return () => {
      cancelled = true;
    };
  }, [token, periods, refreshKey, fail]);

  useEffect(() => {
    if (!periods) return;
    let cancelled = false;
    setLoading((count) => count + 1);
    const subject = userId ?? undefined;
    Promise.all([
      fetchTimeseries(token, periods.current, granularity, subject, "workflow"),
      fetchTimeseries(token, periods.current, granularity, subject, "agent"),
    ])
      .then(([workflow, agent]) => {
        if (cancelled) return;
        setSeries({ granularity, workflow: workflow.data, agent: agent.data });
      })
      .catch((caught) => {
        if (!cancelled) fail(caught);
      })
      .finally(() => setLoading((count) => count - 1));
    return () => {
      cancelled = true;
    };
  }, [token, periods, granularity, userId, refreshKey, fail]);

  return { data, series, error, loading: loading > 0, loadedAt };
}
