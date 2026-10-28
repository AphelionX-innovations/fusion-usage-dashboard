import { useCallback, useEffect, useState } from "react";
import { defaultFromDate, defaultToDate } from "@/shared/format";
import type { Granularity } from "@/shared/types";

export type DashboardTab = "overview" | "features" | "users";

export type DashboardParams = {
  from: string;
  to: string;
  granularity: Granularity;
  userId: string | null;
  tab: DashboardTab;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GRANULARITIES: Granularity[] = ["hour", "day", "week"];
const TABS: DashboardTab[] = ["overview", "features", "users"];

function pick<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function readParams(): DashboardParams {
  const search = new URLSearchParams(window.location.search);
  const from = search.get("from");
  const to = search.get("to");
  return {
    from: from && DATE_PATTERN.test(from) ? from : defaultFromDate(),
    to: to && DATE_PATTERN.test(to) ? to : defaultToDate(),
    granularity: pick(search.get("granularity"), GRANULARITIES, "day"),
    userId: search.get("user") || null,
    tab: pick(search.get("tab"), TABS, "overview"),
  };
}

function writeParams(params: DashboardParams) {
  const url = new URL(window.location.href);
  const search = new URLSearchParams();
  search.set("from", params.from);
  search.set("to", params.to);
  search.set("granularity", params.granularity);
  search.set("tab", params.tab);
  if (params.userId) search.set("user", params.userId);
  url.search = search.toString();
  window.history.replaceState(window.history.state, "", url);
}

export function useDashboardParams() {
  const [params, setParams] = useState<DashboardParams>(readParams);

  useEffect(() => writeParams(params), [params]);

  useEffect(() => {
    const onPopState = () => setParams(readParams());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const update = useCallback((patch: Partial<DashboardParams>) => {
    setParams((current) => ({ ...current, ...patch }));
  }, []);

  return [params, update] as const;
}
