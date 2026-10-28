import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { withOwners } from "@/features/workflows";
import { Kpi } from "@/shared/components/Kpi";
import { DataTable } from "@/shared/components/DataTable";
import { csvFilename, downloadCsv } from "@/shared/csv";
import { formatCount } from "@/shared/format";
import type { ActivityQuery, ActivityResult } from "@/shared/insightTypes";
import { ACTIVITY_COLUMNS, ACTIVITY_CSV, actionLabel } from "./activityColumns";

const ALL = "all";
const LIMITS = [50, 100, 200];

type ActivitySectionProps = {
  result: ActivityResult;
  error: string | null;
  filter: ActivityQuery;
  onFilter: (filter: ActivityQuery) => void;
  authNames: Record<string, string>;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  period: { from: string; to: string };
};

function totalsBy(rows: ActivityResult["summary"], key: "resourceType" | "action") {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row[key], (totals.get(row[key]) ?? 0) + row.count);
  return [...totals.entries()].sort((left, right) => right[1] - left[1]);
}

export function ActivitySection(props: ActivitySectionProps) {
  const { result, filter, onFilter } = props;
  const resources = useMemo(() => totalsBy(result.summary, "resourceType"), [result.summary]);
  const actions = useMemo(() => totalsBy(result.summary, "action"), [result.summary]);
  const rows = useMemo(() => withOwners(result.data, props.authNames), [result.data, props.authNames]);
  const actors = new Set(result.data.map((row) => row.actorUserId ?? row.apiKeyId)).size;
  const deletions = actions.find(([action]) => action === "delete")?.[1] ?? 0;

  function exportVisible() {
    downloadCsv({ filename: csvFilename("activite", props.period), columns: ACTIVITY_CSV, rows });
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {props.error ? (
        <Alert variant="destructive">
          <AlertDescription>{props.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Actions" value={formatCount(result.total)} detail="enregistrées dans le journal d’audit" />
        <Kpi label="Types de ressources" value={formatCount(resources.length)} detail="prompts, datasets, évaluateurs…" />
        <Kpi label="Auteurs" value={formatCount(actors)} detail={`parmi les ${formatCount(result.data.length)} dernières actions`} />
        <Kpi
          label="Suppressions"
          value={formatCount(deletions)}
          detail="ressources supprimées sur la période"
          tone={deletions > 0 ? "warn" : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Ce qui a été fait</CardTitle>
          <CardDescription>Un clic sur un type de ressource filtre le journal.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {resources.length === 0 ? <p className="text-sm text-muted-foreground">Aucune action sur cette période.</p> : null}
          {resources.map(([resourceType, count]) => {
            const active = filter.resourceType === resourceType;
            return (
              <Button
                key={resourceType}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                onClick={() => onFilter({ ...filter, resourceType: active ? undefined : resourceType })}
              >
                {resourceType} · {formatCount(count)}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Journal d’activité</CardTitle>
          <CardDescription>
            {formatCount(rows.length)} actions affichées sur {formatCount(result.total)} · un clic ouvre la fiche du
            propriétaire du projet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filter.action ?? ALL}
              onValueChange={(value) => onFilter({ ...filter, action: value === ALL ? undefined : value })}
            >
              <SelectTrigger className="w-44" aria-label="Action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes les actions</SelectItem>
                {actions.map(([action]) => (
                  <SelectItem key={action} value={action}>
                    {actionLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(filter.limit ?? LIMITS[0])}
              onValueChange={(value) => onFilter({ ...filter, limit: Number(value) })}
            >
              <SelectTrigger className="w-36" aria-label="Nombre de lignes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMITS.map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>
                    {limit} dernières
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={exportVisible} disabled={rows.length === 0}>
              Exporter CSV
            </Button>
          </div>
          <DataTable
            rows={rows}
            columns={ACTIVITY_COLUMNS}
            rowKey={(row) => row.id}
            rowUserId={(row) => row.userId}
            selectedUserId={props.selectedUserId}
            onSelectUser={props.onSelectUser}
            empty="Aucune action pour ce filtre."
          />
        </CardContent>
      </Card>
    </div>
  );
}
