import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, fetchAuthNames, fetchProjects, fetchTimeseries, logout } from "./api";
import { StatusChart, TenantChart, TopEntitiesChart } from "./BreakdownCharts";
import { defaultFromDate, defaultToDate, isoDate, personName, rangeError } from "./format";
import { KpiStrip } from "./KpiStrip";
import { buildEntities, summarize, tenantBreakdown, usageSignals } from "./metrics";
import { buildPeriods, fillSeries } from "./periods";
import { SignalsCard } from "./SignalsCard";
import { TrendChart } from "./TrendChart";
import type { Granularity, Session, TraceBucket, UsageProject } from "./types";
import { UsageTable } from "./UsageTable";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESETS = [7, 30, 90];

type ProjectData = {
  current: UsageProject[];
  previous: UsageProject[];
  authNames: Record<string, string>;
};

type SeriesData = {
  granularity: Granularity;
  current: TraceBucket[];
  previous: TraceBucket[];
};

const EMPTY_PROJECTS: ProjectData = { current: [], previous: [], authNames: {} };

type DashboardPageProps = {
  session: Session;
  onLogout: () => void;
};

export function DashboardPage({ session, onLogout }: DashboardPageProps) {
  const token = session.accessToken;
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [userId, setUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectData>(EMPTY_PROJECTS);
  const [series, setSeries] = useState<SeriesData>({ granularity: "day", current: [], previous: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(0);

  const invalid = rangeError(fromDate, toDate);
  const periods = useMemo(
    () => (invalid ? null : buildPeriods(fromDate, toDate)),
    [fromDate, toDate, invalid],
  );

  const fail = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        onLogout();
        return;
      }
      if (caught instanceof ApiError && caught.code === "FORBIDDEN") {
        setError("Ce compte n’est pas super-admin. Ces statistiques lui sont fermées.");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Chargement impossible.");
    },
    [onLogout],
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
      })
      .catch((caught) => {
        if (!cancelled) fail(caught);
      })
      .finally(() => setLoading((count) => count - 1));
    return () => {
      cancelled = true;
    };
  }, [token, periods, fail]);

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
  }, [token, periods, granularity, userId, fail]);

  const entities = useMemo(
    () => buildEntities({ ...projects, windowEnd: periods?.to ?? new Date() }),
    [projects, periods],
  );
  const summary = summarize(entities, periods?.days ?? 1);
  const signals = usageSignals(entities);
  const tenants = tenantBreakdown(entities);
  const filled = useMemo(() => {
    if (!periods) return { current: [], previous: [] };
    return {
      current: fillSeries(series.current, periods.from, periods.to, series.granularity),
      previous: fillSeries(series.previous, periods.previousFrom, periods.previousTo, series.granularity),
    };
  }, [series, periods]);
  const selectedName = userId
    ? entities.find((entity) => entity.userId === userId)?.name ?? "cet utilisateur"
    : null;

  function applyPreset(days: number) {
    setFromDate(isoDate(new Date(Date.now() - (days - 1) * DAY_MS)));
    setToDate(defaultToDate());
  }

  async function signOut() {
    await logout(session);
    onLogout();
  }

  return (
    <main className={`dashboard${loading > 0 ? " is-loading" : ""}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Super-admin · usage des traces</p>
          <h1>Qui utilise la plateforme, et comment ça évolue</h1>
        </div>
        <div className="topbar-user">
          <span>{personName(session.user)}</span>
          <button type="button" className="ghost" onClick={() => void signOut()}>
            Se déconnecter
          </button>
        </div>
      </header>

      <section className="filters">
        <div className="presets">
          {PRESETS.map((days) => (
            <button key={days} type="button" className="ghost small" onClick={() => applyPreset(days)}>
              {days} jours
            </button>
          ))}
        </div>
        <label>
          Du
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          Au
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <label>
          Granularité
          <select value={granularity} onChange={(event) => setGranularity(event.target.value as Granularity)}>
            <option value="hour">Heure</option>
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
          </select>
        </label>
      </section>

      {invalid || error ? <p className="banner">{invalid ?? error}</p> : null}

      <KpiStrip summary={summary} />

      <div className="row trend-row">
        <TrendChart
          current={filled.current}
          previous={filled.previous}
          granularity={series.granularity}
          subjectName={selectedName}
          onClearSubject={() => setUserId(null)}
        />
        <StatusChart counts={summary.statusCounts} total={entities.length} />
      </div>

      <SignalsCard {...signals} />

      <div className="row">
        <TopEntitiesChart entities={entities} onSelectUser={setUserId} />
        <TenantChart rows={tenants} />
      </div>

      <UsageTable entities={entities} selectedUserId={userId} onSelectUser={setUserId} />
    </main>
  );
}
