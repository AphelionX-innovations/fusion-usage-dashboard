import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBucket, formatCount } from "./format";
import type { Granularity, TopUser, TraceBucket } from "./types";

type UsageChartsProps = {
  series: TraceBucket[];
  topUsers: TopUser[];
  granularity: Granularity;
  onSelectUser: (userId: string) => void;
};

export function UsageCharts({
  series,
  topUsers,
  granularity,
  onSelectUser,
}: UsageChartsProps) {
  const points = series.map((bucket) => ({
    ...bucket,
    label: formatBucket(bucket.bucket, granularity),
  }));
  const bars = topUsers.map((user, index) => ({
    ...user,
    label: user.userName || user.userId || `Projet ${index + 1}`,
  }));

  return (
    <div className="charts">
      <article className="card chart-card">
        <header>
          <h2>Évolution des traces</h2>
          <p>Somme des traces sur la période, par {granularityLabel(granularity)}.</p>
        </header>
        {points.length === 0 ? (
          <p className="empty">Aucune trace sur cette période.</p>
        ) : (
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e6dfd4" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5c564e", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#5c564e", fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCount(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="traceCount"
                  name="Traces"
                  stroke="#0c6b58"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
      <article className="card chart-card">
        <header>
          <h2>Top utilisateurs</h2>
          <p>Projets avec le plus de traces. Un clic filtre l’évolution.</p>
        </header>
        {bars.length === 0 ? (
          <p className="empty">Aucun projet n’a de traces sur cette période.</p>
        ) : (
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={bars}
                layout="vertical"
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#e6dfd4" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#5c564e", fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tick={{ fill: "#1a1814", fontSize: 12 }}
                />
                <Tooltip formatter={(value) => formatCount(Number(value))} />
                <Bar
                  dataKey="traceCount"
                  name="Traces"
                  fill="#b84a2a"
                  radius={[0, 6, 6, 0]}
                  onClick={(entry) => {
                    const userId = (entry as { userId?: string | null }).userId;
                    if (userId) onSelectUser(userId);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
    </div>
  );
}

function granularityLabel(granularity: Granularity): string {
  if (granularity === "hour") return "heure";
  if (granularity === "week") return "semaine";
  return "jour";
}
