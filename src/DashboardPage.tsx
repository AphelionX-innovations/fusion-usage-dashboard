import { useEffect, useState } from "react";
import { ApiError, fetchProjects, fetchTimeseries, fetchTopUsers, logout } from "./api";
import {
  defaultFromDate,
  defaultToDate,
  formatCount,
  personName,
  rangeError,
  toRangeBounds,
} from "./format";
import { ProjectsTable } from "./ProjectsTable";
import type { Granularity, Session, TimeseriesSubject, TopUser, TraceBucket, UsageProject } from "./types";
import { UsageCharts } from "./UsageCharts";

type DashboardPageProps = {
  session: Session;
  onLogout: () => void;
};

export function DashboardPage({ session, onLogout }: DashboardPageProps) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [limit, setLimit] = useState(5);
  const [userId, setUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<UsageProject[]>([]);
  const [series, setSeries] = useState<TraceBucket[]>([]);
  const [subject, setSubject] = useState<TimeseriesSubject | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const invalid = rangeError(fromDate, toDate);
    if (invalid) {
      setError(invalid);
      setLoading(false);
      return;
    }

    const { from, to } = toRangeBounds(fromDate, toDate);
    const range = { from: from.toISOString(), to: to.toISOString() };
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [projectRows, seriesResult, topRows] = await Promise.all([
          fetchProjects(session.accessToken, range),
          fetchTimeseries(
            session.accessToken,
            range,
            granularity,
            userId ?? undefined,
          ),
          fetchTopUsers(session.accessToken, range, limit),
        ]);
        if (cancelled) return;
        setProjects(projectRows);
        setSeries(seriesResult.data);
        setSubject(seriesResult.subject);
        setTopUsers(topRows);
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) {
          onLogout();
          return;
        }
        if (caught instanceof ApiError && caught.code === "FORBIDDEN") {
          setError("Ce compte n’est pas super-admin. Ces statistiques lui sont fermées.");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Chargement impossible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [session.accessToken, fromDate, toDate, granularity, limit, userId, onLogout]);

  const totalTraces = projects.reduce((sum, project) => sum + project.traceCount, 0);
  const activeProjects = projects.filter((project) => project.traceCount > 0).length;
  const linkedUsers = new Set(
    projects.filter((project) => project.userId && project.traceCount > 0).map((project) => project.userId),
  ).size;
  const selectedName =
    subject?.userName ||
    projects.find((project) => project.userId === userId)?.userName ||
    userId;

  async function signOut() {
    await logout(session);
    onLogout();
  }

  return (
    <main className={`dashboard${loading ? " is-loading" : ""}`}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Super-admin</p>
          <h1>Usage des traces</h1>
        </div>
        <div className="topbar-user">
          <span>{personName(session.user)}</span>
          <button type="button" className="ghost" onClick={() => void signOut()}>
            Se déconnecter
          </button>
        </div>
      </header>

      <section className="filters card">
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
          <select
            value={granularity}
            onChange={(event) => setGranularity(event.target.value as Granularity)}
          >
            <option value="hour">Heure</option>
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
          </select>
        </label>
        <label>
          Top
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
        {userId ? (
          <button type="button" className="ghost" onClick={() => setUserId(null)}>
            Filtre : {selectedName} · retirer
          </button>
        ) : null}
      </section>

      {error ? <p className="banner">{error}</p> : null}

      <section className="stats">
        <article>
          <span>Traces</span>
          <strong>{formatCount(totalTraces)}</strong>
        </article>
        <article>
          <span>Projets</span>
          <strong>{formatCount(projects.length)}</strong>
        </article>
        <article>
          <span>Projets actifs</span>
          <strong>{formatCount(activeProjects)}</strong>
        </article>
        <article>
          <span>Utilisateurs actifs</span>
          <strong>{formatCount(linkedUsers)}</strong>
        </article>
      </section>

      <UsageCharts
        series={series}
        topUsers={topUsers}
        granularity={granularity}
        onSelectUser={setUserId}
      />
      <ProjectsTable
        projects={projects}
        selectedUserId={userId}
        onSelectUser={setUserId}
      />
    </main>
  );
}
