import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatBucket, formatChange, formatCount } from "@/shared/format";
import type { Granularity, TraceBucket } from "@/shared/types";

const chartConfig = {
  traceCount: { label: "Période actuelle", color: "var(--chart-3)" },
  previous: { label: "Période précédente", color: "var(--chart-5)" },
} satisfies ChartConfig;

type TrendChartProps = {
  current: TraceBucket[];
  previous: TraceBucket[];
  granularity: Granularity;
  subjectName: string | null;
  onClearSubject: () => void;
};

export function TrendChart({
  current,
  previous,
  granularity,
  subjectName,
  onClearSubject,
}: TrendChartProps) {
  const points = current.map((bucket, index) => ({
    label: formatBucket(bucket.bucket, granularity),
    traceCount: bucket.traceCount,
    previous: previous[index]?.traceCount ?? null,
  }));
  const total = current.reduce((sum, bucket) => sum + bucket.traceCount, 0);
  const previousTotal = previous.reduce((sum, bucket) => sum + bucket.traceCount, 0);
  const peak = points.reduce<(typeof points)[number] | null>(
    (best, point) => (point.traceCount > (best?.traceCount ?? 0) ? point : best),
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Évolution des traces</CardTitle>
        <CardDescription>
          {subjectName ? `Filtré sur ${subjectName}` : "Tous les projets"} · trait pointillé : période précédente
        </CardDescription>
        {subjectName ? (
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={onClearSubject}>
              Retirer le filtre
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3">
        <dl className="flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Total</dt>
            <dd className="font-semibold">{formatCount(total)}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Variation</dt>
            <dd className="font-semibold">{formatChange(total, previousTotal)}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">Pic</dt>
            <dd className="font-semibold">{peak ? `${formatCount(peak.traceCount)} · ${peak.label}` : "—"}</dd>
          </div>
        </dl>
        {total === 0 && previousTotal === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucune trace sur ces deux périodes.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" minTickGap={24} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCount(Number(value))} />} />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="var(--color-previous)"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
              />
              <Line type="monotone" dataKey="traceCount" stroke="var(--color-traceCount)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
