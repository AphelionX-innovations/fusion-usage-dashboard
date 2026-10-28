import { Bar, BarChart, CartesianGrid, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCost, formatCount, formatDuration, formatPercent } from "@/shared/format";
import type { AgentDurationTotal, CostSummary, WorkflowTotal } from "./featureMetrics";

const costConfig = {
  amount: { label: "Coût" },
  workflow: { label: "Workflows", color: "var(--c-workflow)" },
  agent: { label: "Agents", color: "var(--c-agent)" },
} satisfies ChartConfig;

const workflowConfig = {
  traceCount: { label: "Traces", color: "var(--c-workflow)" },
} satisfies ChartConfig;

const durationConfig = {
  avg: { label: "Durée moyenne", color: "var(--chart-3)" },
  p95: { label: "p95 le plus lent", color: "var(--chart-2)" },
} satisfies ChartConfig;

function shorten(value: string, max = 16): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function FeatureCostChart({ costs }: { costs: CostSummary }) {
  const total = costs.workflowCost + costs.agentCost;
  const data = (
    [
      ["workflow", costs.workflowCost],
      ["agent", costs.agentCost],
    ] as const
  )
    .filter(([, amount]) => amount > 0)
    .map(([kind, amount]) => ({ kind, amount, fill: `var(--color-${kind})` }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="font-heading text-xl">Coût workflows et agents</CardTitle>
        <CardDescription>Somme des observations de coût rattachées à chaque type.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {!costs.hasTotals || data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Aucune observation de coût sur cette période.</p>
        ) : (
          <ChartContainer config={costConfig} className="mx-auto aspect-square max-h-[250px] w-full">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => formatCost(Number(value))} />} />
              <Pie data={data} dataKey="amount" nameKey="kind" innerRadius={68} strokeWidth={5}>
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                          {formatCost(total)}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                          Coût total
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="kind" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {costs.hasTotals && total > 0
          ? `Workflows ${formatPercent(costs.workflowCost / total)} · agents ${formatPercent(costs.agentCost / total)}`
          : "Le coût apparaît quand les observations sont demandées."}
      </CardFooter>
    </Card>
  );
}

export function WorkflowVolumeChart({ rows }: { rows: WorkflowTotal[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Workflows les plus utilisés</CardTitle>
        <CardDescription>Traces par graphe, tous utilisateurs confondus. Le détail donne le coût, les erreurs et les nœuds.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucun workflow utilisé sur cette période.</p>
        ) : (
          <ChartContainer config={workflowConfig} className="aspect-auto w-full" style={{ height: Math.max(220, rows.length * 36) }}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={150} tickFormatter={(value: string) => shorten(value)} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const row = item.payload as WorkflowTotal;
                      const nodes = row.nodeCount === null ? "nœuds inconnus" : `${formatCount(row.nodeCount)} nœuds`;
                      return `${formatCount(Number(value))} traces · ${formatCost(row.totalCost)} · ${formatCount(row.errorCount)} erreurs · ${nodes} · ${formatCount(row.users)} utilisateurs`;
                    }}
                  />
                }
              />
              <Bar dataKey="traceCount" fill="var(--color-traceCount)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function AgentDurationChart({ rows }: { rows: AgentDurationTotal[] }) {
  const points = rows.map((row) => ({
    ...row,
    avg: (row.avgDurationMs ?? 0) / 1000,
    p95: (row.p95DurationMs ?? 0) / 1000,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Durée des agents</CardTitle>
        <CardDescription>Durée moyenne et p95 le plus lent, en secondes, pour les flows les plus exécutés.</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucune durée d’agent sur cette période.</p>
        ) : (
          <ChartContainer config={durationConfig} className="aspect-auto h-[280px] w-full">
            <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} tickMargin={8} axisLine={false} interval={0} tickFormatter={(value: string) => shorten(value, 12)} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dashed"
                    formatter={(_value, _name, item) => {
                      const row = item.payload as AgentDurationTotal;
                      const duration = item.dataKey === "p95" ? row.p95DurationMs : row.avgDurationMs;
                      return `${formatDuration(duration)} · ${formatCount(row.runs)} exécutions`;
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="avg" fill="var(--color-avg)" radius={4} />
              <Bar dataKey="p95" fill="var(--color-p95)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
