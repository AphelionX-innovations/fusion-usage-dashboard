import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { csvFilename, downloadCsv, type CsvColumn } from "@/shared/csv";
import { formatCompact, formatCost, formatCount, formatDateTime, formatDuration } from "@/shared/format";
import type { AgentFlowUsage, WorkflowUsage } from "@/shared/types";
import { workflowNodeCount, type Owned } from "./featureMetrics";

type Tab = "workflow" | "agent";

type FeatureTablesProps = {
  workflows: Owned<WorkflowUsage>[];
  agents: Owned<AgentFlowUsage>[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  period: { from: string; to: string };
};

const OWNER_COLUMNS: CsvColumn<Owned<WorkflowUsage | AgentFlowUsage>>[] = [
  { header: "Utilisateur", value: (row) => row.ownerName },
  { header: "User ID", value: (row) => row.userId },
  { header: "Tenant", value: (row) => row.ownerTenant },
  { header: "Projet", value: (row) => row.projectId },
];

const WORKFLOW_COLUMNS: CsvColumn<Owned<WorkflowUsage>>[] = [
  { header: "Workflow", value: (row) => row.workflowName },
  { header: "Graph ID", value: (row) => row.graphId },
  ...OWNER_COLUMNS,
  { header: "Traces", value: (row) => row.traceCount },
  { header: "Sessions", value: (row) => row.uniqueSessions },
  { header: "Nœuds", value: (row) => workflowNodeCount(row) },
  { header: "Coût USD", value: (row) => row.totalCost },
  { header: "Tokens", value: (row) => row.totalTokens },
  { header: "Erreurs", value: (row) => row.errorCount },
  { header: "Premier usage", value: (row) => row.firstUsedAt },
  { header: "Dernier usage", value: (row) => row.lastUsedAt },
];

const AGENT_COLUMNS: CsvColumn<Owned<AgentFlowUsage>>[] = [
  { header: "Flow", value: (row) => row.flowName },
  { header: "Flow ID", value: (row) => row.flowId },
  ...OWNER_COLUMNS,
  { header: "Exécutions", value: (row) => row.runCount },
  { header: "Sessions", value: (row) => row.uniqueSessions },
  { header: "Durée moyenne ms", value: (row) => row.avgDurationMs },
  { header: "p50 ms", value: (row) => row.p50DurationMs },
  { header: "p95 ms", value: (row) => row.p95DurationMs },
  { header: "Max ms", value: (row) => row.maxDurationMs },
  { header: "Coût USD", value: (row) => row.totalCost },
  { header: "Tokens", value: (row) => row.totalTokens },
  { header: "Erreurs", value: (row) => row.errorCount },
  { header: "Premier usage", value: (row) => row.firstUsedAt },
  { header: "Dernier usage", value: (row) => row.lastUsedAt },
];

function matchesQuery(needle: string, values: (string | null)[]): boolean {
  return !needle || values.some((value) => (value ?? "").toLowerCase().includes(needle));
}

function ErrorCell({ count }: { count: number | undefined }) {
  if (count === undefined) return <TableCell className="text-right text-muted-foreground">—</TableCell>;
  return (
    <TableCell className={cn("text-right tabular-nums", count > 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
      {formatCount(count)}
    </TableCell>
  );
}

function Owner({ row }: { row: Owned<WorkflowUsage | AgentFlowUsage> }) {
  return (
    <TableCell className="whitespace-normal">
      <span className="block font-medium">{row.ownerName}</span>
      <span className="block text-xs text-muted-foreground">{row.ownerTenant || "Sans tenant"}</span>
    </TableCell>
  );
}

function formatNodeCount(row: Pick<WorkflowUsage, "avgNodeCount" | "maxNodeCount">): string {
  const nodes = workflowNodeCount(row);
  return nodes === null ? "—" : formatCount(nodes);
}

function Num({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <TableCell className={cn("text-right tabular-nums", muted && "text-muted-foreground")}>{children}</TableCell>;
}

export function FeatureTables({ workflows, agents, selectedUserId, onSelectUser, period }: FeatureTablesProps) {
  const [tab, setTab] = useState<Tab>("workflow");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const visibleWorkflows = useMemo(
    () =>
      workflows.filter(
        (row) =>
          (!selectedUserId || row.userId === selectedUserId) &&
          matchesQuery(needle, [row.workflowName, row.graphId, row.ownerName, row.ownerTenant]),
      ),
    [workflows, selectedUserId, needle],
  );
  const visibleAgents = useMemo(
    () =>
      agents.filter(
        (row) =>
          (!selectedUserId || row.userId === selectedUserId) &&
          matchesQuery(needle, [row.flowName, row.flowId, row.ownerName, row.ownerTenant]),
      ),
    [agents, selectedUserId, needle],
  );

  function rowProps(userId: string | null) {
    const selected = userId !== null && userId === selectedUserId;
    return {
      "data-state": selected ? "selected" : undefined,
      className: cn(userId && "cursor-pointer", selected && "bg-accent"),
      tabIndex: userId ? 0 : undefined,
      onClick: () => {
        if (userId) onSelectUser(userId);
      },
      onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
        if (event.key === "Enter" && userId) onSelectUser(userId);
      },
    };
  }

  function exportVisible() {
    if (tab === "workflow") {
      downloadCsv({ filename: csvFilename("workflows", period), columns: WORKFLOW_COLUMNS, rows: visibleWorkflows });
      return;
    }
    downloadCsv({ filename: csvFilename("agents", period), columns: AGENT_COLUMNS, rows: visibleAgents });
  }

  const count = tab === "workflow" ? visibleWorkflows.length : visibleAgents.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Détail par workflow et par flow</CardTitle>
        <CardDescription>
          {formatCount(count)} lignes{selectedUserId ? " pour l’utilisateur sélectionné" : ""} · un clic ouvre la fiche de
          l’utilisateur.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList>
              <TabsTrigger value="workflow">Workflows · {formatCount(workflows.length)}</TabsTrigger>
              <TabsTrigger value="agent">Agents · {formatCount(agents.length)}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            type="search"
            className="w-64"
            placeholder="Workflow, flow ou utilisateur"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="button" variant="outline" size="sm" onClick={exportVisible} disabled={count === 0}>
            Exporter CSV
          </Button>
        </div>
        <div className="max-h-[560px] overflow-auto">
          {tab === "workflow" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="text-right">Traces</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Nœuds</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Erreurs</TableHead>
                  <TableHead>Dernier usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleWorkflows.map((row) => (
                  <TableRow key={`${row.projectId}:${row.graphId}:${row.workflowName}`} {...rowProps(row.userId)}>
                    <TableCell className="whitespace-normal">
                      <span className="block font-medium">{row.workflowName || "Workflow sans nom"}</span>
                      <code className="mt-1 block max-w-64 truncate text-xs text-muted-foreground">{row.graphId}</code>
                    </TableCell>
                    <Owner row={row} />
                    <Num>{formatCount(row.traceCount)}</Num>
                    <Num>{formatCount(row.uniqueSessions)}</Num>
                    <Num>{formatNodeCount(row)}</Num>
                    <Num>{formatCost(row.totalCost)}</Num>
                    <Num>{row.totalTokens === undefined ? "—" : formatCompact(row.totalTokens)}</Num>
                    <ErrorCell count={row.errorCount} />
                    <TableCell>{formatDateTime(row.lastUsedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flow agentique</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="text-right">Exécutions</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Durée moy.</TableHead>
                  <TableHead className="text-right">p50</TableHead>
                  <TableHead className="text-right">p95</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                  <TableHead className="text-right">Erreurs</TableHead>
                  <TableHead>Dernier usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAgents.map((row) => (
                  <TableRow key={`${row.projectId}:${row.flowId}:${row.flowName}`} {...rowProps(row.userId)}>
                    <TableCell className="whitespace-normal">
                      <span className="block font-medium">{row.flowName || "Flow sans nom"}</span>
                      <code className="mt-1 block max-w-64 truncate text-xs text-muted-foreground">{row.flowId}</code>
                    </TableCell>
                    <Owner row={row} />
                    <Num>{formatCount(row.runCount)}</Num>
                    <Num>{formatCount(row.uniqueSessions)}</Num>
                    <Num>{formatDuration(row.avgDurationMs)}</Num>
                    <Num muted>{formatDuration(row.p50DurationMs)}</Num>
                    <Num>{formatDuration(row.p95DurationMs)}</Num>
                    <Num muted>{formatDuration(row.maxDurationMs)}</Num>
                    <Num>{formatCost(row.totalCost)}</Num>
                    <ErrorCell count={row.errorCount} />
                    <TableCell>{formatDateTime(row.lastUsedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {count === 0 ? <p className="text-sm text-muted-foreground">Aucune ligne pour ce filtre.</p> : null}
      </CardContent>
    </Card>
  );
}
