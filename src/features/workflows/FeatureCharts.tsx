import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { FEATURE_META, featureUsage, type FeatureEntity } from "./featureMetrics";
import { formatBucket, formatCount } from "@/shared/format";
import type { Granularity, TraceBucket } from "@/shared/types";

const TOP_SIZE = 10;

const trendConfig = {
  workflow: { label: FEATURE_META.workflow.label, color: FEATURE_META.workflow.color },
  agent: { label: FEATURE_META.agent.label, color: FEATURE_META.agent.color },
} satisfies ChartConfig;

const adoptionConfig = {
  workflowTraceCount: { label: FEATURE_META.workflow.label, color: FEATURE_META.workflow.color },
  agentTraceCount: { label: FEATURE_META.agent.label, color: FEATURE_META.agent.color },
  otherTraceCount: { label: FEATURE_META.other.label, color: FEATURE_META.other.color },
} satisfies ChartConfig;

function shorten(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function userIdFrom(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as { userId?: string | null; payload?: { userId?: string | null } };
  return record.userId ?? record.payload?.userId ?? null;
}

export function FeatureTrendChart(props: {
  workflow: TraceBucket[];
  agent: TraceBucket[];
  granularity: Granularity;
  subjectName: string | null;
}) {
  const points = props.workflow.map((bucket, index) => ({
    label: formatBucket(bucket.bucket, props.granularity),
    workflow: bucket.traceCount,
    agent: props.agent[index]?.traceCount ?? 0,
  }));
  const empty = points.every((point) => point.workflow === 0 && point.agent === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Workflows et agents dans le temps</CardTitle>
        <CardDescription>
          {props.subjectName ? `Filtré sur ${props.subjectName}` : "Tous les utilisateurs"} · traces par type d’usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-8 text-sm text-muted-foreground">Aucune trace de workflow ou d’agent sur cette période.</p>
        ) : (
          <ChartContainer config={trendConfig} className="aspect-auto h-[320px] w-full">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" minTickGap={24} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCount(Number(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="workflow" stroke="var(--color-workflow)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="agent" stroke="var(--color-agent)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function FeatureAdoptionChart(props: {
  entities: FeatureEntity[];
  onSelectUser: (userId: string) => void;
}) {
  const bars = props.entities.filter((entity) => featureUsage(entity) > 0).slice(0, TOP_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Qui utilise quoi</CardTitle>
        <CardDescription>Top {TOP_SIZE} des utilisateurs de workflows et d’agents. Un clic ouvre la fiche.</CardDescription>
      </CardHeader>
      <CardContent>
        {bars.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            Personne n’a encore utilisé les workflows ou les agents sur cette période.
          </p>
        ) : (
          <ChartContainer
            config={adoptionConfig}
            className="aspect-auto w-full"
            style={{ height: Math.max(280, bars.length * 40) }}
          >
            <BarChart
              accessibilityLayer
              data={bars}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              barSize={16}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={132}
                tickFormatter={(value: string) => shorten(value, 18)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCount(Number(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              {(["workflow", "agent", "other"] as const).map((feature, index, all) => (
                <Bar
                  key={feature}
                  dataKey={`${feature}TraceCount`}
                  stackId="usage"
                  fill={`var(--color-${feature}TraceCount)`}
                  radius={index === all.length - 1 ? [0, 4, 4, 0] : undefined}
                  cursor="pointer"
                  onClick={(entry) => {
                    const userId = userIdFrom(entry);
                    if (userId) props.onSelectUser(userId);
                  }}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
