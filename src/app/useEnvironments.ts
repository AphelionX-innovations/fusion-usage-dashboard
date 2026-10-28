import { useEffect, useState } from "react";
import { fetchEnvironments } from "@/shared/insightsApi";
import type { EnvironmentUsage } from "@/shared/insightTypes";
import type { Periods } from "@/shared/periods";

export function useEnvironments(params: { token: string; periods: Periods | null; refreshKey: number }) {
  const { token, periods, refreshKey } = params;
  const [environments, setEnvironments] = useState<EnvironmentUsage[]>([]);

  useEffect(() => {
    if (!periods) return;
    let cancelled = false;
    fetchEnvironments(token, periods.current)
      .then((rows) => {
        if (!cancelled) setEnvironments(rows);
      })
      .catch(() => {
        if (!cancelled) setEnvironments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, periods, refreshKey]);

  return environments;
}
