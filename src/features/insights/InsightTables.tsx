import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withOwners, type Owned } from "@/features/workflows";
import { DataTable, type DataColumn } from "@/shared/components/DataTable";
import { csvFilename, downloadCsv } from "@/shared/csv";
import { formatCount } from "@/shared/format";
import type { UsageIdentity } from "@/shared/types";
import {
  csvColumns,
  DATASET_COLUMNS,
  EVALUATION_COLUMNS,
  MODEL_COLUMNS,
  PROMPT_COLUMNS,
  SCORE_COLUMNS,
  TOOL_COLUMNS,
} from "./insightColumns";
import type { InsightData } from "./useInsights";

type InsightKey = keyof InsightData;

type TableConfig = {
  label: string;
  empty: string;
  columns: DataColumn<Owned<UsageIdentity>>[];
  rowKey: (row: Owned<UsageIdentity>) => string;
  search: (row: Owned<UsageIdentity>) => (string | null)[];
};

function config<T extends UsageIdentity>(table: {
  label: string;
  empty: string;
  columns: DataColumn<Owned<T>>[];
  rowKey: (row: Owned<T>) => string;
  search: (row: Owned<T>) => (string | null)[];
}): TableConfig {
  return table as unknown as TableConfig;
}

const TABLES: Record<InsightKey, TableConfig> = {
  models: config({
    label: "Modèles",
    empty: "Aucun appel de modèle sur cette période.",
    columns: MODEL_COLUMNS,
    rowKey: (row) => `${row.projectId}:${row.model}`,
    search: (row) => [row.model],
  }),
  prompts: config({
    label: "Prompts",
    empty: "Aucun prompt géré n’a été utilisé sur cette période.",
    columns: PROMPT_COLUMNS,
    rowKey: (row) => `${row.projectId}:${row.promptName}:${row.promptVersion}`,
    search: (row) => [row.promptName],
  }),
  tools: config({
    label: "Outils",
    empty: "Aucun appel d’outil sur cette période.",
    columns: TOOL_COLUMNS,
    rowKey: (row) => `${row.projectId}:${row.toolName}`,
    search: (row) => [row.toolName],
  }),
  scores: config({
    label: "Scores",
    empty: "Aucun score sur cette période.",
    columns: SCORE_COLUMNS,
    rowKey: (row) => `${row.projectId}:${row.name}:${row.source}:${row.dataType}`,
    search: (row) => [row.name, row.source],
  }),
  evaluations: config({
    label: "Évaluateurs",
    empty: "Aucun évaluateur exécuté sur cette période.",
    columns: EVALUATION_COLUMNS,
    rowKey: (row) => `${row.projectId}:${row.evaluatorId}`,
    search: (row) => [row.scoreName, row.templateName],
  }),
  datasets: config({
    label: "Datasets",
    empty: "Aucun dataset.",
    columns: DATASET_COLUMNS,
    rowKey: (row) => `${row.projectId}:${row.datasetId}`,
    search: (row) => [row.name],
  }),
};

const KEYS = Object.keys(TABLES) as InsightKey[];

type InsightTablesProps = {
  data: InsightData;
  authNames: Record<string, string>;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  period: { from: string; to: string };
};

export function InsightTables({ data, authNames, selectedUserId, onSelectUser, period }: InsightTablesProps) {
  const [tab, setTab] = useState<InsightKey>("models");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const table = TABLES[tab];

  const rows = useMemo(() => {
    const owned = withOwners(data[tab] as UsageIdentity[], authNames);
    if (!needle) return owned;
    return owned.filter((row) =>
      [...table.search(row), row.ownerName, row.ownerTenant].some((value) =>
        (value ?? "").toLowerCase().includes(needle),
      ),
    );
  }, [data, tab, authNames, needle, table]);

  function exportVisible() {
    downloadCsv({ filename: csvFilename(tab, period), columns: csvColumns(table.columns), rows });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Détail par ressource</CardTitle>
        <CardDescription>
          {formatCount(rows.length)} lignes{selectedUserId ? " pour l’utilisateur sélectionné" : ""} · un clic ouvre la
          fiche de l’utilisateur.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={(value) => setTab(value as InsightKey)}>
            <TabsList className="flex-wrap">
              {KEYS.map((key) => (
                <TabsTrigger key={key} value={key}>
                  {TABLES[key].label} · {formatCount(data[key].length)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            type="search"
            className="w-64"
            placeholder="Nom ou utilisateur"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="button" variant="outline" size="sm" onClick={exportVisible} disabled={rows.length === 0}>
            Exporter CSV
          </Button>
        </div>
        <DataTable
          rows={rows}
          columns={table.columns}
          rowKey={table.rowKey}
          rowUserId={(row) => row.userId}
          selectedUserId={selectedUserId}
          onSelectUser={onSelectUser}
          empty={needle ? "Aucune ligne pour cette recherche." : table.empty}
        />
      </CardContent>
    </Card>
  );
}
