import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCost, formatCount } from "@/shared/format";
import type { ModelTotal } from "./insightMetrics";

const chartConfig = {
  callCount: { label: "Appels", color: "var(--chart-1)" },
} satisfies ChartConfig;

function shorten(value: string, max = 24): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function ModelChart({ rows }: { rows: ModelTotal[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Appels par modèle</CardTitle>
        <CardDescription>Les modèles les plus sollicités sur la période, avec leur coût et leurs erreurs.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucun appel de modèle sur cette période.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: Math.max(200, rows.length * 34) }}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="model"
                width={170}
                tickFormatter={(value: string) => shorten(value)}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const row = item.payload as ModelTotal;
                      return `${formatCount(Number(value))} appels · ${formatCost(row.totalCost)} · ${formatCount(row.errorCount)} erreurs`;
                    }}
                  />
                }
              />
              <Bar dataKey="callCount" fill="var(--color-callCount)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
