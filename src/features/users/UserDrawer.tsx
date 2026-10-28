import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { STATUS_META, type UsageEntity } from "@/features/overview";
import { summarizeAgentFlows, summarizeCosts, type FeatureEntity } from "@/features/workflows";
import { DrawerSkeleton } from "@/shared/components/DrawerSkeleton";
import { changeTone, formatChange, formatCount, formatDateTime, formatDuration, formatPercent } from "@/shared/format";
import type { AgentFlowUsage, Granularity, UsageProject, WorkflowUsage } from "@/shared/types";
import {
  AgentList,
  costLine,
  DrawerTrendChart,
  ProjectList,
  UsageMix,
  WorkflowList,
  type DrawerTrend,
} from "./UserDrawerSections";

type UserDrawerProps = {
  open: boolean;
  entity: UsageEntity | undefined;
  feature: FeatureEntity | undefined;
  projects: UsageProject[];
  workflows: WorkflowUsage[];
  agents: AgentFlowUsage[];
  trend: DrawerTrend;
  granularity: Granularity;
  loading: boolean;
  onClose: () => void;
};

const TONE_CLASS = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-muted-foreground",
} as const;

export function UserDrawer(props: UserDrawerProps) {
  const { entity, feature, onClose } = props;
  const costs = summarizeCosts(props.workflows, props.agents);
  const agentSummary = summarizeAgentFlows(props.agents);
  const status = entity ? STATUS_META[entity.status] : null;

  return (
    <Sheet open={props.open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 overflow-hidden bg-card p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]"
      >
        <SheetHeader className="shrink-0 gap-1 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Fiche utilisateur</p>
              <SheetTitle className="mt-1 truncate text-lg">{entity?.name ?? "Utilisateur"}</SheetTitle>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onClose}>
              Fermer
            </Button>
          </div>
          <SheetDescription>{entity?.tenantName || "Sans tenant"}</SheetDescription>
          {status ? (
            <Badge variant="outline" className="mt-1">
              <i className="size-1.5 rounded-full" style={{ background: status.color }} />
              {status.label}
            </Badge>
          ) : null}
        </SheetHeader>

        {props.loading && !entity ? (
          <DrawerSkeleton />
        ) : !entity ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Aucune donnée pour ce compte sur la période choisie.</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <dl className="grid grid-cols-2 gap-2">
              <Stat label="Traces">
                <span className="font-mono">{formatCount(entity.traceCount)}</span>
                <em className={`ml-2 text-sm font-medium not-italic ${TONE_CLASS[changeTone(entity.traceCount, entity.previousCount)]}`}>
                  {formatChange(entity.traceCount, entity.previousCount)}
                </em>
              </Stat>
              <Stat label="Part du total">{entity.traceCount > 0 ? formatPercent(entity.share) : "—"}</Stat>
              <Stat label="Projets actifs">{formatCount(entity.projectCount)}</Stat>
              <Stat label="Dernière trace">{formatDateTime(entity.lastTraceAt)}</Stat>
            </dl>

            <section className="mt-5">
              <SectionTitle>Usage de la plateforme</SectionTitle>
              <UsageMix feature={feature} />
              {costs.hasTotals ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Workflows et agents : {costLine({ cost: costs.workflowCost + costs.agentCost, tokens: costs.totalTokens, errors: costs.errorCount })}
                  {agentSummary.runs > 0 ? ` · agents ${formatDuration(agentSummary.avgDurationMs)} en moyenne` : ""}
                </p>
              ) : null}
            </section>

            <section className={`mt-5${props.loading ? " opacity-60" : ""}`}>
              <SectionTitle>Évolution sur la période</SectionTitle>
              <DrawerTrendChart trend={props.trend} granularity={props.granularity} />
            </section>

            <section className="mt-5">
              <SectionTitle count={props.workflows.length}>Workflows</SectionTitle>
              <WorkflowList rows={props.workflows} />
            </section>

            <section className="mt-5">
              <SectionTitle count={props.agents.length}>Flows agentiques</SectionTitle>
              <AgentList rows={props.agents} />
            </section>

            <section className="mt-5 pb-2">
              <SectionTitle count={props.projects.length}>Projets</SectionTitle>
              <ProjectList rows={props.projects} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
      {count === undefined ? null : <span className="font-mono tracking-normal">{formatCount(count)}</span>}
    </h3>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted px-3 py-2">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-sm leading-snug font-medium text-foreground">{children}</dd>
    </div>
  );
}
