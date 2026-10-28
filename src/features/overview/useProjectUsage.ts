import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchAuthNames, fetchProjects, fetchTimeseries } from "@/shared/api";
import type { Periods } from "@/shared/periods";
import type { Granularity, TraceBucket, UsageProject } from "@/shared/types";

export type ProjectData = {
  current: UsageProject[];
  previous: UsageProject[];
  authNames: Record<string, string>;
};

export type SeriesData = {
  granularity: Granularity;
  current: TraceBucket[];
  previous: TraceBucket[];
};

const EMPTY_PROJECTS: ProjectData = { current: [], previous: [], authNames: {} };
const EMPTY_SERIES: SeriesData = { granularity: "day", current: [], previous: [] };

export function useProjectUsage(params: {
  token: string;
  periods: Periods | null;
  granularity: Granularity;
  userId: string | null;
  refreshKey: number;
  onUnauthorized: () => void;
}) {
  const { token, periods, granularity, userId, refreshKey, onUnauthorized } = params;
  const [projects, setProjects] = useState<ProjectData>(EMPTY_PROJECTS);
  const [series, setSeries] = useState<SeriesData>(EMPTY_SERIES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const fail = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        onUnauthorized();
        return;
      }
      if (caught instanceof ApiError && caught.code === "FORBIDDEN") {
        setError("Ce compte n’est pas super-admin. Ces statistiques lui sont fermées.");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Chargement impossible.");
    },
    [onUnauthorized],
  );

  useEffect(() => {
    if (!periods) return;
    let cancelled = false;
    setLoading((count) => count + 1);
    Promise.all([fetchProjects(token, periods.current), fetchProjects(token, periods.previous)])
      .then(async ([current, previous]) => {
        const ids = [...new Set(current.flatMap((project) => (project.userId ? [project.userId] : [])))];
        const authNames = await fetchAuthNames(token, ids);
        if (cancelled) return;
        setProjects({ current, previous, authNames });
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
    Promise.all([
      fetchTimeseries(token, periods.current, granularity, userId ?? undefined),
      fetchTimeseries(token, periods.previous, granularity, userId ?? undefined),
    ])
      .then(([current, previous]) => {
        if (cancelled) return;
        setSeries({ granularity, current: current.data, previous: previous.data });
      })
      .catch((caught) => {
        if (!cancelled) fail(caught);
      })
      .finally(() => setLoading((count) => count - 1));
    return () => {
      cancelled = true;
    };
  }, [token, periods, granularity, userId, refreshKey, fail]);

  return { projects, series, error, loading: loading > 0, loadedAt };
}
