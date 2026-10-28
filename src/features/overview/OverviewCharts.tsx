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
import { formatChange, formatCount, formatPercent } from "@/shared/format";

type MixRow = {
  workflowTraceCount: number;
  agentTraceCount: number;
  otherTraceCount: number;
};

type TenantRow = {
  name: string;
  traceCount: number;
  previousCount: number;
};

const mixConfig = {
  traces: { label: "Traces" },
  workflow: { label: "Workflows", color: "var(--c-workflow)" },
  agent: { label: "Agents", color: "var(--c-agent)" },
  other: { label: "Autres traces", color: "var(--c-other)" },
} satisfies ChartConfig;

const sourceConfig = {
  traces: { label: "Traces" },
  auth: { label: "Comptes auth", color: "var(--primary)" },
  local: { label: "Hors auth", color: "var(--c-local)" },
} satisfies ChartConfig;

const compareConfig = {
  traceCount: { label: "Période actuelle", color: "var(--chart-3)" },
  previousCount: { label: "Période précédente", color: "var(--chart-5)" },
} satisfies ChartConfig;

function CenterTotal({ value, caption }: { value: string; caption: string }) {
  return (
    <Label
      content={({ viewBox }) => {
        if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
        return (
          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
              {value}
            </tspan>
            <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
              {caption}
            </tspan>
          </text>
        );
      }}
    />
  );
}

function Donut({
  data,
  config,
  total,
  caption,
}: {
  data: { kind: string; traces: number; fill: string }[];
  config: ChartConfig;
  total: number;
  caption: string;
}) {
  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[250px] w-full">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => formatCount(Number(value))} />} />
        <Pie data={data} dataKey="traces" nameKey="kind" innerRadius={68} strokeWidth={5}>
          <CenterTotal value={formatCount(total)} caption={caption} />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="kind" />} />
      </PieChart>
    </ChartContainer>
  );
}

export function UsageMixChart({
  entities,
  state,
}: {
  entities: MixRow[];
  state: "loading" | "ready" | "error";
}) {
  const totals = entities.reduce(
    (sum, entity) => ({
      workflow: sum.workflow + entity.workflowTraceCount,
      agent: sum.agent + entity.agentTraceCount,
      other: sum.other + entity.otherTraceCount,
    }),
    { workflow: 0, agent: 0, other: 0 },
  );
  const total = totals.workflow + totals.agent + totals.other;
  const data = (
    [
      ["workflow", totals.workflow],
      ["agent", totals.agent],
      ["other", totals.other],
    ] as const
  )
    .filter(([, traces]) => traces > 0)
    .map(([kind, traces]) => ({ kind, traces, fill: `var(--color-${kind})` }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="font-heading text-xl">Répartition de l’usage</CardTitle>
        <CardDescription>Workflows, agents et autres traces. Les parts d’un projet totalisent 100 %.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {state === "loading" ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Chargement de la répartition.</p>
        ) : state === "error" ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Répartition indisponible pour le moment.</p>
        ) : data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Aucune trace sur cette période.</p>
        ) : (
          <Donut data={data} config={mixConfig} total={total} caption="Traces" />
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {total > 0
          ? `Workflows ${formatPercent(totals.workflow / total)} · agents ${formatPercent(totals.agent / total)} · autres ${formatPercent(totals.other / total)}`
          : "En attente des traces classées."}
      </CardFooter>
    </Card>
  );
}

export function SourceChart({ entities }: { entities: { source: "auth" | "local"; traceCount: number }[] }) {
  const totals = entities.reduce(
    (sum, entity) => {
      sum[entity.source] += entity.traceCount;
      return sum;
    },
    { auth: 0, local: 0 },
  );
  const total = totals.auth + totals.local;
  const data = (
    [
      ["auth", totals.auth],
      ["local", totals.local],
    ] as const
  )
    .filter(([, traces]) => traces > 0)
    .map(([kind, traces]) => ({ kind, traces, fill: `var(--color-${kind})` }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="font-heading text-xl">Origine des traces</CardTitle>
        <CardDescription>Volume envoyé par les comptes authentifiés et par les projets hors auth.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Aucune trace sur cette période.</p>
        ) : (
          <Donut data={data} config={sourceConfig} total={total} caption="Traces" />
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {total > 0
          ? `Comptes auth ${formatPercent(totals.auth / total)} · hors auth ${formatPercent(totals.local / total)}`
          : "Aucune trace à répartir."}
      </CardFooter>
    </Card>
  );
}

function shorten(value: string, max = 14): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function TenantCompareChart({ rows }: { rows: TenantRow[] }) {
  const current = rows.reduce((sum, row) => sum + row.traceCount, 0);
  const previous = rows.reduce((sum, row) => sum + row.previousCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Tenants, période contre période</CardTitle>
        <CardDescription>Les organisations les plus actives, face à la fenêtre précédente de même durée.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucune trace sur cette période.</p>
        ) : (
          <ChartContainer config={compareConfig} className="aspect-auto h-[280px] w-full">
            <BarChart accessibilityLayer data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                interval={0}
                tickFormatter={(value: string) => shorten(value)}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" formatter={(value) => formatCount(Number(value))} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="traceCount" fill="var(--color-traceCount)" radius={4} />
              <Bar dataKey="previousCount" fill="var(--color-previousCount)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {rows.length > 0 ? `Variation de ces tenants : ${formatChange(current, previous)}` : "Rien à comparer."}
      </CardFooter>
    </Card>
  );
}
