import { useCallback, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ActivitySection, useActivity } from "@/features/activity";
import { InsightSection, useInsights } from "@/features/insights";
import {
  buildEntities,
  KpiStrip,
  SignalsCard,
  StatusChart,
  summarize,
  tenantBreakdown,
  TenantChart,
  TopEntitiesChart,
  TrendChart,
  UsageTable,
  usageSignals,
  useProjectUsage,
} from "@/features/overview";
import { UserDrawer, type UserOption } from "@/features/users";
import { buildFeatureEntities, FeatureSection, featureUsage, useFeatureUsage } from "@/features/workflows";
import { logout } from "@/shared/api";
import { personName, rangeError } from "@/shared/format";
import type { ActivityQuery } from "@/shared/insightTypes";
import { buildPeriods, fillSeries } from "@/shared/periods";
import type { Session } from "@/shared/types";
import { AppSidebar } from "./AppSidebar";
import { DashboardFilters } from "./DashboardFilters";
import { PAGE_COPY } from "./navigation";
import { TabSkeleton } from "./Skeleton";
import { useDashboardParams, type DashboardTab } from "./useDashboardParams";
import { useEnvironments } from "./useEnvironments";

type DashboardPageProps = {
  session: Session;
  onLogout: () => void;
};

export function DashboardPage({ session, onLogout }: DashboardPageProps) {
  const token = session.accessToken;
  const [params, update] = useDashboardParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityQuery>({ limit: 50 });
  const { userId, granularity, tab, environment } = params;

  const invalid = rangeError(params.from, params.to);
  const periods = useMemo(
    () => (invalid ? null : buildPeriods(params.from, params.to, environment)),
    [params.from, params.to, environment, invalid],
  );
  const loadParams = { token, periods, granularity, userId, refreshKey, onUnauthorized: onLogout };
  const usage = useProjectUsage(loadParams);
  const features = useFeatureUsage(loadParams);
  const insights = useInsights({ ...loadParams, enabled: tab === "insights" });
  const activity = useActivity({ ...loadParams, filter: activityFilter, enabled: tab === "activity" });
  const environments = useEnvironments({ token, periods, refreshKey });
  const { projects, series } = usage;

  const entities = useMemo(
    () => buildEntities({ ...projects, windowEnd: periods?.to ?? new Date() }),
    [projects, periods],
  );
  const summary = summarize(entities, periods?.days ?? 1);
  const signals = usageSignals(entities);
  const tenants = tenantBreakdown(entities);
  const filled = useMemo(() => {
    if (!periods) return { current: [], previous: [], workflow: [], agent: [] };
    return {
      current: fillSeries(series.current, periods.from, periods.to, series.granularity),
      previous: fillSeries(series.previous, periods.previousFrom, periods.previousTo, series.granularity),
      workflow: fillSeries(features.series.workflow, periods.from, periods.to, features.series.granularity),
      agent: fillSeries(features.series.agent, periods.from, periods.to, features.series.granularity),
    };
  }, [series, features.series, periods]);

  const featureEntities = useMemo(
    () => buildFeatureEntities(features.data.current, projects.authNames),
    [features.data.current, projects.authNames],
  );
  const featureByKey = useMemo(
    () => new Map(featureEntities.map((entity) => [entity.key, entity])),
    [featureEntities],
  );
  const userOptions = useMemo<UserOption[]>(
    () =>
      entities.flatMap((entity) =>
        entity.userId
          ? [{ userId: entity.userId, name: entity.name, tenantName: entity.tenantName, traceCount: entity.traceCount }]
          : [],
      ),
    [entities],
  );
  const selectedEntity = userId ? entities.find((entity) => entity.userId === userId) : undefined;
  const selectedName = userId ? (selectedEntity?.name ?? "cet utilisateur") : null;
  const drawerData = useMemo(() => {
    if (!userId) return null;
    return {
      projects: projects.current.filter((project) => project.userId === userId),
      workflows: features.data.workflows.filter((row) => row.userId === userId),
      agents: features.data.agents.filter((row) => row.userId === userId),
    };
  }, [userId, projects, features.data]);

  const busy = usage.loading || features.loading || insights.loading || activity.loading;
  const tabLoad: Record<DashboardTab, { loading: boolean; loadedAt: Date | null }> = {
    overview: usage,
    features,
    insights,
    activity,
    users: usage,
  };
  const firstLoad = !tabLoad[tab].loadedAt && tabLoad[tab].loading;
  const period = { from: params.from, to: params.to };
  const tabCounts: Record<DashboardTab, number | null> = {
    overview: null,
    features: features.loadedAt ? featureEntities.filter((entity) => featureUsage(entity) > 0).length : null,
    insights: null,
    activity: activity.loadedAt ? activity.result.total : null,
    users: usage.loadedAt ? entities.length : null,
  };
  const copy = PAGE_COPY[tab];
  const sessionName = personName(session.user);

  const selectUser = useCallback(
    (id: string) => {
      update({ userId: id });
      setDrawerOpen(true);
    },
    [update],
  );
  const clearUser = useCallback(() => {
    update({ userId: null });
    setDrawerOpen(false);
  }, [update]);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  async function signOut() {
    await logout(session);
    onLogout();
  }

  return (
    <SidebarProvider>
      <AppSidebar
        tab={tab}
        tabCounts={tabCounts}
        onTab={(next) => update({ tab: next })}
        sessionName={sessionName}
        onSignOut={() => void signOut()}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex flex-col gap-4 border-b bg-background/90 px-4 py-3 backdrop-blur">
          <div className="flex items-start gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mt-1 h-6" />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">{copy.eyebrow}</p>
              <h1 className="font-heading text-xl leading-tight md:text-2xl">{copy.title}</h1>
            </div>
          </div>
          <DashboardFilters
            params={params}
            onChange={update}
            environments={environments}
            userOptions={userOptions}
            onSelectUser={selectUser}
            onClearUser={clearUser}
            busy={busy}
            loadedAt={usage.loadedAt}
            onRefresh={() => setRefreshKey((key) => key + 1)}
          />
        </header>

        <div className="grid gap-4 p-4">
          {invalid || usage.error ? (
            <Alert variant="destructive">
              <AlertDescription>{invalid ?? usage.error}</AlertDescription>
            </Alert>
          ) : null}

          {selectedName && !drawerOpen ? (
            <Alert>
              <AlertDescription className="flex flex-wrap items-center gap-2 text-foreground">
                Courbes et détails filtrés sur <strong>{selectedName}</strong>
                <Button type="button" size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>
                  Voir la fiche
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={clearUser}>
                  Retirer le filtre
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {firstLoad ? (
            <TabSkeleton tab={tab} />
          ) : (
            <div role="tabpanel">
              {tab === "overview" ? (
                <div className="grid gap-4">
                  <KpiStrip summary={summary} />
                  <div className="grid items-start gap-3 xl:grid-cols-[1.7fr_1fr]">
                    <TrendChart
                      current={filled.current}
                      previous={filled.previous}
                      granularity={series.granularity}
                      subjectName={selectedName}
                      onClearSubject={clearUser}
                    />
                    <StatusChart counts={summary.statusCounts} total={entities.length} />
                  </div>
                  <SignalsCard {...signals} />
                  <div className="grid items-start gap-3 lg:grid-cols-2">
                    <TopEntitiesChart entities={entities} onSelectUser={selectUser} />
                    <TenantChart rows={tenants} />
                  </div>
                </div>
              ) : null}

              {tab === "features" ? (
                <FeatureSection
                  data={features.data}
                  series={features.series}
                  entities={featureEntities}
                  authNames={projects.authNames}
                  periods={periods}
                  error={features.error}
                  subjectName={selectedName}
                  selectedUserId={userId}
                  onSelectUser={selectUser}
                  period={period}
                />
              ) : null}

              {tab === "insights" ? (
                <InsightSection
                  data={insights.data}
                  errors={insights.errors}
                  authNames={projects.authNames}
                  environment={environment}
                  selectedUserId={userId}
                  onSelectUser={selectUser}
                  period={period}
                />
              ) : null}

              {tab === "activity" ? (
                <ActivitySection
                  result={activity.result}
                  error={activity.error}
                  filter={activityFilter}
                  onFilter={setActivityFilter}
                  authNames={projects.authNames}
                  selectedUserId={userId}
                  onSelectUser={selectUser}
                  period={period}
                />
              ) : null}

              {tab === "users" ? (
                <UsageTable
                  entities={entities}
                  featureByKey={featureByKey}
                  selectedUserId={userId}
                  onSelectUser={selectUser}
                  period={period}
                />
              ) : null}
            </div>
          )}
        </div>
      </SidebarInset>

      <UserDrawer
        open={drawerOpen && drawerData !== null}
        entity={selectedEntity}
        feature={selectedEntity ? featureByKey.get(selectedEntity.key) : undefined}
        projects={drawerData?.projects ?? []}
        workflows={drawerData?.workflows ?? []}
        agents={drawerData?.agents ?? []}
        trend={{ current: filled.current, workflow: filled.workflow, agent: filled.agent }}
        granularity={series.granularity}
        loading={busy}
        onClose={closeDrawer}
      />
    </SidebarProvider>
  );
}
