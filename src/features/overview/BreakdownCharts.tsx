import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatChange, formatCount, formatPercent } from "@/shared/format";
import { STATUS_META, type EntityStatus, type UsageEntity } from "./metrics";

const statusConfig = {
  active: { label: STATUS_META.active.label, color: "var(--s-active)" },
  slowing: { label: STATUS_META.slowing.label, color: "var(--s-slowing)" },
  stopped: { label: STATUS_META.stopped.label, color: "var(--s-stopped)" },
  dormant: { label: STATUS_META.dormant.label, color: "var(--s-dormant)" },
} satisfies ChartConfig;

const topConfig = {
  traceCount: { label: "Traces", color: "var(--chart-3)" },
} satisfies ChartConfig;

const tenantConfig = {
  traceCount: { label: "Traces", color: "var(--chart-1)" },
} satisfies ChartConfig;

function shorten(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function userIdFrom(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as { userId?: string | null; payload?: { userId?: string | null } };
  return record.userId ?? record.payload?.userId ?? null;
}

export function StatusChart({
  counts,
  total,
}: {
  counts: Record<EntityStatus, number>;
  total: number;
}) {
  const data = (Object.keys(STATUS_META) as EntityStatus[]).map((status) => ({
    status,
    value: counts[status],
    ...STATUS_META[status],
  }));
  const slices = data.filter((row) => row.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Santé de l’usage</CardTitle>
        <CardDescription>Répartition des {formatCount(total)} utilisateurs et projets.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ChartContainer config={statusConfig} className="mx-auto aspect-auto h-[200px] w-full max-w-xs">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
              {slices.map((row) => (
                <Cell key={row.status} fill={row.color} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value) => formatCount(Number(value))} />} />
          </PieChart>
        </ChartContainer>
        <ul className="grid gap-2">
          {data.map((row) => (
            <li key={row.status} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm">
              <i className="size-2.5 rounded-full" style={{ background: row.color }} />
              <span className="grid">
                <strong>{row.label}</strong>
                <small className="text-xs text-muted-foreground">{row.hint}</small>
              </span>
              <b className="grid text-right">
                {formatCount(row.value)}
                <small className="text-xs font-medium text-muted-foreground">
                  {total > 0 ? formatPercent(row.value / total) : "—"}
                </small>
              </b>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function TopEntitiesChart({
  entities,
  onSelectUser,
}: {
  entities: UsageEntity[];
  onSelectUser: (userId: string) => void;
}) {
  const bars = entities.filter((entity) => entity.traceCount > 0).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Top 10 consommateurs</CardTitle>
        <CardDescription>
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-primary align-middle" /> compte auth ·{" "}
          <span className="mr-1 inline-block size-2.5 rounded-sm bg-local align-middle" /> projet hors auth. Un clic ouvre la fiche.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bars.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucune trace sur cette période.</p>
        ) : (
          <ChartContainer config={topConfig} className="aspect-auto w-full" style={{ height: Math.max(220, bars.length * 32) }}>
            <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tickFormatter={(value: string) => shorten(value)}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const entity = item.payload as UsageEntity;
                      return `${formatCount(Number(value))} · ${formatPercent(entity.share)} du total · ${formatChange(entity.traceCount, entity.previousCount)}`;
                    }}
                  />
                }
              />
              <Bar
                dataKey="traceCount"
                radius={[0, 6, 6, 0]}
                onClick={(entry) => {
                  const userId = userIdFrom(entry);
                  if (userId) onSelectUser(userId);
                }}
              >
                {bars.map((entity) => (
                  <Cell key={entity.key} fill={entity.source === "auth" ? "var(--primary)" : "var(--c-local)"} cursor={entity.userId ? "pointer" : "default"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function TenantChart({
  rows,
}: {
  rows: { name: string; traceCount: number; previousCount: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Traces par tenant</CardTitle>
        <CardDescription>Organisations qui portent l’usage, avec la variation.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucune trace sur cette période.</p>
        ) : (
          <ChartContainer config={tenantConfig} className="aspect-auto w-full" style={{ height: Math.max(220, rows.length * 32) }}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tickFormatter={(value: string) => shorten(value, 18)}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const row = item.payload as { traceCount: number; previousCount: number };
                      return `${formatCount(Number(value))} · ${formatChange(row.traceCount, row.previousCount)}`;
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
