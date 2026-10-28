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
import { formatCompact, formatCost, formatCount, formatPercent } from "@/shared/format";
import type { EvaluationOutcomes, ModelTotal, PromptTotal, ScoreTotal, UserCallTotal } from "./insightMetrics";

const tokenConfig = {
  inputTokens: { label: "Tokens entrée", color: "var(--chart-1)" },
  outputTokens: { label: "Tokens sortie", color: "var(--chart-3)" },
} satisfies ChartConfig;

const userConfig = {
  callCount: { label: "Appels", color: "var(--chart-1)" },
} satisfies ChartConfig;

const promptConfig = {
  callCount: { label: "Appels", color: "var(--chart-4)" },
} satisfies ChartConfig;

const scoreConfig = {
  scoreCount: { label: "Scores", color: "var(--chart-5)" },
} satisfies ChartConfig;

const outcomeConfig = {
  traces: { label: "Exécutions" },
  completed: { label: "Réussies", color: "var(--s-active)" },
  errors: { label: "Erreurs", color: "var(--chart-2)" },
  waiting: { label: "En attente", color: "var(--chart-4)" },
  cancelled: { label: "Annulées", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

function shorten(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function userIdFrom(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as { userId?: string | null; payload?: { userId?: string | null } };
  return record.userId ?? record.payload?.userId ?? null;
}

function formatScore(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

export function TokenChart({ rows }: { rows: ModelTotal[] }) {
  const visible = rows.filter((row) => row.inputTokens + row.outputTokens > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Tokens par modèle</CardTitle>
        <CardDescription>Entrée et sortie, pour les modèles les plus appelés.</CardDescription>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucun token compté sur cette période.</p>
        ) : (
          <ChartContainer config={tokenConfig} className="aspect-auto w-full" style={{ height: Math.max(220, visible.length * 36) }}>
            <BarChart data={visible} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value: number) => formatCompact(value)} />
              <YAxis type="category" dataKey="model" width={150} tickFormatter={(value: string) => shorten(value, 18)} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCompact(Number(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="inputTokens" stackId="tokens" fill="var(--color-inputTokens)" />
              <Bar dataKey="outputTokens" stackId="tokens" fill="var(--color-outputTokens)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function UserModelChart({
  rows,
  onSelectUser,
}: {
  rows: UserCallTotal[];
  onSelectUser: (userId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Utilisateurs des modèles</CardTitle>
        <CardDescription>Appels LLM par compte. Un clic ouvre la fiche.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucun appel de modèle sur cette période.</p>
        ) : (
          <ChartContainer config={userConfig} className="aspect-auto w-full" style={{ height: Math.max(220, rows.length * 36) }}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={150} tickFormatter={(value: string) => shorten(value, 18)} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const row = item.payload as UserCallTotal;
                      return `${formatCount(Number(value))} appels · ${formatCost(row.totalCost)} · ${formatCount(row.errorCount)} erreurs`;
                    }}
                  />
                }
              />
              <Bar
                dataKey="callCount"
                fill="var(--color-callCount)"
                radius={[0, 6, 6, 0]}
                onClick={(entry) => {
                  const userId = userIdFrom(entry);
                  if (userId) onSelectUser(userId);
                }}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function PromptChart({ rows }: { rows: PromptTotal[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Prompts les plus appelés</CardTitle>
        <CardDescription>Chaque version reste distincte. Le détail indique tokens, coût et erreurs.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucun prompt géré n’a été utilisé sur cette période.</p>
        ) : (
          <ChartContainer config={promptConfig} className="aspect-auto w-full" style={{ height: Math.max(220, rows.length * 36) }}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={160} tickFormatter={(value: string) => shorten(value, 20)} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const row = item.payload as PromptTotal;
                      return `${formatCount(Number(value))} appels · ${formatCompact(row.totalTokens)} tokens · ${formatCost(row.totalCost)} · ${formatCount(row.errorCount)} erreurs`;
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

export function ScoreChart({ rows }: { rows: ScoreTotal[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Scores produits</CardTitle>
        <CardDescription>Volume par nom de score. La moyenne n’existe que pour les scores numériques.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">Aucun score sur cette période.</p>
        ) : (
          <ChartContainer config={scoreConfig} className="aspect-auto w-full" style={{ height: Math.max(220, rows.length * 36) }}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={150} tickFormatter={(value: string) => shorten(value, 18)} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const row = item.payload as ScoreTotal;
                      return `${formatCount(Number(value))} · moyenne ${formatScore(row.avgValue)} · ${row.dataType}`;
                    }}
                  />
                }
              />
              <Bar dataKey="scoreCount" fill="var(--color-scoreCount)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function EvaluationChart({ outcomes }: { outcomes: EvaluationOutcomes }) {
  const total = outcomes.completed + outcomes.errors + outcomes.waiting + outcomes.cancelled;
  const data = (
    [
      ["completed", outcomes.completed],
      ["errors", outcomes.errors],
      ["waiting", outcomes.waiting],
      ["cancelled", outcomes.cancelled],
    ] as const
  )
    .filter(([, traces]) => traces > 0)
    .map(([kind, traces]) => ({ kind, traces, fill: `var(--color-${kind})` }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="font-heading text-xl">Issue des évaluations</CardTitle>
        <CardDescription>Réussites, erreurs, attentes et annulations sur la période.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Aucune évaluation exécutée sur cette période.</p>
        ) : (
          <ChartContainer config={outcomeConfig} className="mx-auto aspect-square max-h-[250px] w-full">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => formatCount(Number(value))} />} />
              <Pie data={data} dataKey="traces" nameKey="kind" innerRadius={68} strokeWidth={5}>
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                          {formatCount(total)}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                          Exécutions
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
        {total > 0 ? `${formatPercent(outcomes.errors / total)} d’erreurs · ${formatPercent(outcomes.completed / total)} réussies` : "Rien à répartir."}
      </CardFooter>
    </Card>
  );
}
