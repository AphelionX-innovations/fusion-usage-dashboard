import { useEffect, useState } from "react";
import { ApiError } from "@/shared/api";
import { fetchActivity } from "@/shared/insightsApi";
import type { ActivityQuery, ActivityResult } from "@/shared/insightTypes";
import type { Periods } from "@/shared/periods";

const EMPTY: ActivityResult = { data: [], summary: [], total: 0 };

export function useActivity(params: {
  token: string;
  periods: Periods | null;
  userId: string | null;
  filter: ActivityQuery;
  enabled: boolean;
  refreshKey: number;
  onUnauthorized: () => void;
}) {
  const { token, periods, userId, enabled, refreshKey, onUnauthorized } = params;
  const { resourceType, action, limit } = params.filter;
  const [result, setResult] = useState<ActivityResult>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!periods || !enabled) return;
    let cancelled = false;
    setLoading(true);
    fetchActivity({
      token,
      range: periods.current,
      userId: userId ?? undefined,
      filter: { resourceType, action, limit },
    })
      .then((next) => {
        if (cancelled) return;
        setResult(next);
        setError(null);
        setLoadedAt(new Date());
      })
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) {
          onUnauthorized();
          return;
        }
        setError(caught instanceof Error ? caught.message : "Chargement de l’activité impossible.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, periods, userId, resourceType, action, limit, enabled, refreshKey, onUnauthorized]);

  return { result, error, loading, loadedAt };
}
