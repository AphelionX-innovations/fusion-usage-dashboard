import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { FeatureEntity } from "@/features/workflows";
import { csvFilename, downloadCsv } from "@/shared/csv";
import { changeTone, formatChange, formatCount, formatDateTime, formatPercent } from "@/shared/format";
import { isDeclining, STATUS_META, type UsageEntity } from "./metrics";

type Filter = "all" | "auth" | "local" | "watch" | "workflow" | "agent";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "auth", label: "Comptes auth" },
  { value: "local", label: "Hors auth" },
  { value: "workflow", label: "Workflows" },
  { value: "agent", label: "Agents" },
  { value: "watch", label: "À surveiller" },
];

type UsageTableProps = {
  entities: UsageEntity[];
  featureByKey: Map<string, FeatureEntity>;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  period: { from: string; to: string };
};

function matches(entity: UsageEntity, filter: Filter, feature: FeatureEntity | undefined): boolean {
  if (filter === "auth") return entity.source === "auth";
  if (filter === "local") return entity.source === "local";
  if (filter === "watch") return isDeclining(entity);
  if (filter === "workflow") return (feature?.workflowTraceCount ?? 0) > 0;
  if (filter === "agent") return (feature?.agentTraceCount ?? 0) > 0;
  return true;
}

function toneClass(current: number, previous: number) {
  const tone = changeTone(current, previous);
  if (tone === "up") return "font-semibold text-primary";
  if (tone === "down") return "font-semibold text-destructive";
  return "text-muted-foreground";
}

function FeatureChips({ feature }: { feature: FeatureEntity | undefined }) {
  const workflow = feature?.workflowTraceCount ?? 0;
  const agent = feature?.agentTraceCount ?? 0;
  if (workflow === 0 && agent === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {workflow > 0 ? (
        <Badge className="border-transparent bg-workflow-soft text-workflow">Workflow · {formatCount(workflow)}</Badge>
      ) : null}
      {agent > 0 ? (
        <Badge className="border-transparent bg-agent-soft text-agent-text">Agent · {formatCount(agent)}</Badge>
      ) : null}
    </span>
  );
}

export function UsageTable({ entities, featureByKey, selectedUserId, onSelectUser, period }: UsageTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entities.filter(
      (entity) =>
        matches(entity, filter, featureByKey.get(entity.key)) &&
        (!needle ||
          entity.name.toLowerCase().includes(needle) ||
          (entity.tenantName ?? "").toLowerCase().includes(needle)),
    );
  }, [entities, featureByKey, filter, query]);

  function exportVisible() {
    downloadCsv({
      filename: csvFilename("utilisateurs", period),
      rows: visible,
      columns: [
        { header: "Nom", value: (entity) => entity.name },
        { header: "Type", value: (entity) => (entity.source === "auth" ? "Compte auth" : "Projet hors auth") },
        { header: "User ID", value: (entity) => entity.userId },
        { header: "Tenant", value: (entity) => entity.tenantName },
        { header: "Projets", value: (entity) => entity.projectCount },
        { header: "Traces", value: (entity) => entity.traceCount },
        { header: "Période précédente", value: (entity) => entity.previousCount },
        { header: "Part", value: (entity) => Math.round(entity.share * 10000) / 10000 },
        { header: "Traces workflow", value: (entity) => featureByKey.get(entity.key)?.workflowTraceCount ?? 0 },
        { header: "Traces agent", value: (entity) => featureByKey.get(entity.key)?.agentTraceCount ?? 0 },
        { header: "Dernière trace", value: (entity) => entity.lastTraceAt },
        { header: "Statut", value: (entity) => STATUS_META[entity.status].label },
      ],
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Utilisateurs et projets</CardTitle>
        <CardDescription>{formatCount(visible.length)} lignes · un clic sur un compte auth ouvre sa fiche.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <TabsList className="h-auto flex-wrap">
              {FILTERS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            type="search"
            className="w-56"
            placeholder="Nom ou tenant"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="button" variant="outline" size="sm" onClick={exportVisible} disabled={visible.length === 0}>
            Exporter CSV
          </Button>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Traces</TableHead>
                <TableHead className="text-right">Période préc.</TableHead>
                <TableHead className="text-right">Variation</TableHead>
                <TableHead className="text-right">Part</TableHead>
                <TableHead>Usage plateforme</TableHead>
                <TableHead>Dernière trace</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((entity) => {
                const selected = entity.userId !== null && entity.userId === selectedUserId;
                const meta = STATUS_META[entity.status];
                return (
                  <TableRow
                    key={entity.key}
                    data-state={selected ? "selected" : undefined}
                    className={cn(entity.userId && "cursor-pointer", selected && "bg-accent")}
                    tabIndex={entity.userId ? 0 : undefined}
                    onClick={() => {
                      if (entity.userId) onSelectUser(entity.userId);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && entity.userId) onSelectUser(entity.userId);
                    }}
                  >
                    <TableCell>
                      <strong className="block">{entity.name}</strong>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "mt-1",
                          entity.source === "auth" && "bg-accent text-accent-foreground",
                          entity.source === "local" && "bg-local-soft text-local",
                        )}
                      >
                        {entity.source === "auth" ? "Compte auth" : "Projet hors auth"}
                        {entity.projectCount > 1 ? ` · ${entity.projectCount} projets` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>{entity.tenantName || "—"}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCount(entity.traceCount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatCount(entity.previousCount)}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", toneClass(entity.traceCount, entity.previousCount))}>
                      {formatChange(entity.traceCount, entity.previousCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entity.traceCount > 0 ? formatPercent(entity.share) : "—"}
                    </TableCell>
                    <TableCell>
                      <FeatureChips feature={featureByKey.get(entity.key)} />
                    </TableCell>
                    <TableCell>{formatDateTime(entity.lastTraceAt)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <i className="size-2 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {visible.length === 0 ? <p className="text-sm text-muted-foreground">Aucune ligne pour ce filtre.</p> : null}
      </CardContent>
    </Card>
  );
}
