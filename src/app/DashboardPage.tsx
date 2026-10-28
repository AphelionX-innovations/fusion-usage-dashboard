import { useCallback, useMemo, useState } from "react";
import { LayoutDashboardIcon, LogOutIcon, MoonIcon, SunIcon, UsersIcon, WorkflowIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
import { formatCount, personName, rangeError } from "@/shared/format";
import { buildPeriods, fillSeries } from "@/shared/periods";
import type { Session } from "@/shared/types";
import { DashboardFilters } from "./DashboardFilters";
import { TabSkeleton } from "./Skeleton";
import { useTheme } from "./theme";
import { useDashboardParams, type DashboardTab } from "./useDashboardParams";

const NAV: { value: DashboardTab; label: string; icon: typeof LayoutDashboardIcon }[] = [
  { value: "overview", label: "Vue d’ensemble", icon: LayoutDashboardIcon },
  { value: "features", label: "Workflows et agents", icon: WorkflowIcon },
  { value: "users", label: "Utilisateurs", icon: UsersIcon },
];

const PAGE_COPY: Record<DashboardTab, { eyebrow: string; title: string }> = {
  overview: {
    eyebrow: "Super-admin · usage des traces",
    title: "Qui utilise la plateforme, et comment ça évolue",
  },
  features: {
    eyebrow: "Workflows et agents",
    title: "Comment la plateforme est utilisée",
  },
  users: {
    eyebrow: "Comptes et projets",
    title: "Utilisateurs et projets",
  },
};

type DashboardPageProps = {
  session: Session;
  onLogout: () => void;
};

function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "F";
}

export function DashboardPage({ session, onLogout }: DashboardPageProps) {
  const token = session.accessToken;
  const [params, update] = useDashboardParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { userId, granularity, tab } = params;

  const invalid = rangeError(params.from, params.to);
  const periods = useMemo(
    () => (invalid ? null : buildPeriods(params.from, params.to)),
    [params.from, params.to, invalid],
  );
  const loadParams = { token, periods, granularity, userId, refreshKey, onUnauthorized: onLogout };
  const usage = useProjectUsage(loadParams);
  const features = useFeatureUsage(loadParams);
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

  const busy = usage.loading || features.loading;
  const firstLoad = tab === "features" ? !features.loadedAt && features.loading : !usage.loadedAt && usage.loading;
  const period = { from: params.from, to: params.to };
  const tabCounts: Record<DashboardTab, number | null> = {
    overview: null,
    features: features.loadedAt ? featureEntities.filter((entity) => featureUsage(entity) > 0).length : null,
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
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Fusion Usage">
                <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
                  F
                </span>
                <span className="grid text-left leading-tight">
                  <span className="truncate font-semibold">Fusion</span>
                  <span className="truncate text-xs tracking-wide text-muted-foreground uppercase">Usage des traces</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Console télémétrie</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((option) => (
                  <SidebarMenuItem key={option.value}>
                    <SidebarMenuButton
                      isActive={tab === option.value}
                      tooltip={option.label}
                      onClick={() => update({ tab: option.value })}
                    >
                      <option.icon />
                      <span>{option.label}</span>
                    </SidebarMenuButton>
                    {tabCounts[option.value] !== null ? (
                      <SidebarMenuBadge>{formatCount(tabCounts[option.value] ?? 0)}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="pointer-events-none" tooltip={sessionName}>
                <Avatar className="size-8">
                  <AvatarFallback>{initials(sessionName)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{sessionName}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={theme === "dark" ? "Mode clair" : "Mode sombre"}
                onClick={toggle}
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Se déconnecter" onClick={() => void signOut()}>
                <LogOutIcon />
                <span>Se déconnecter</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
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
