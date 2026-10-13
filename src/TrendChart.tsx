import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBucket, formatChange, formatCount } from "./format";
import type { Granularity, TraceBucket } from "./types";

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
    <article className="card chart-card trend">
      <header className="chart-head">
        <div>
          <h2>Évolution des traces</h2>
          <p>
            {subjectName ? `Filtré sur ${subjectName}` : "Tous les projets"} · trait
            pointillé : période précédente
          </p>
        </div>
        {subjectName ? (
          <button type="button" className="ghost small" onClick={onClearSubject}>
            Retirer le filtre
          </button>
        ) : null}
      </header>
      <dl className="trend-facts">
        <div>
          <dt>Total</dt>
          <dd>{formatCount(total)}</dd>
        </div>
        <div>
          <dt>Variation</dt>
          <dd>{formatChange(total, previousTotal)}</dd>
        </div>
        <div>
          <dt>Pic</dt>
          <dd>{peak ? `${formatCount(peak.traceCount)} · ${peak.label}` : "—"}</dd>
        </div>
      </dl>
      {total === 0 && previousTotal === 0 ? (
        <p className="empty">Aucune trace sur ces deux périodes.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e6dfd4" vertical={false} />
            <XAxis dataKey="label" minTickGap={24} tick={{ fill: "#5c564e", fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#5c564e", fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCount(Number(value))} />
            <Line
              type="monotone"
              dataKey="previous"
              name="Période précédente"
              stroke="#b8afa3"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="traceCount"
              name="Période actuelle"
              stroke="#0c6b58"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </article>
  );
}
