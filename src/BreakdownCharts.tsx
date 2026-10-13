import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChange, formatCount, formatPercent } from "./format";
import { STATUS_META, type EntityStatus, type UsageEntity } from "./metrics";

const SOURCE_COLOR = { auth: "#0c6b58", local: "#b84a2a" } as const;

function shorten(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
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

  return (
    <article className="card chart-card">
      <header>
        <h2>Santé de l’usage</h2>
        <p>Répartition des {formatCount(total)} utilisateurs et projets.</p>
      </header>
      <div className="status-body">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data.filter((row) => row.value > 0)}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {data
                .filter((row) => row.value > 0)
                .map((row) => (
                  <Cell key={row.status} fill={row.color} />
                ))}
            </Pie>
            <Tooltip formatter={(value) => formatCount(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="legend">
          {data.map((row) => (
            <li key={row.status}>
              <i style={{ background: row.color }} />
              <span>
                <strong>{row.label}</strong>
                <small>{row.hint}</small>
              </span>
              <b>
                {formatCount(row.value)}
                <small>{total > 0 ? formatPercent(row.value / total) : "—"}</small>
              </b>
            </li>
          ))}
        </ul>
      </div>
    </article>
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
    <article className="card chart-card">
      <header>
        <h2>Top 10 consommateurs</h2>
        <p>
          <span className="swatch auth" /> compte auth · <span className="swatch local" /> projet
          hors auth. Un clic filtre l’évolution.
        </p>
      </header>
      {bars.length === 0 ? (
        <p className="empty">Aucune trace sur cette période.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, bars.length * 32)}>
          <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#e6dfd4" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: "#5c564e", fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tickFormatter={(value: string) => shorten(value)}
              tick={{ fill: "#1a1814", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, _name, item) => {
                const entity = item.payload as UsageEntity;
                return [
                  `${formatCount(Number(value))} · ${formatPercent(entity.share)} du total · ${formatChange(entity.traceCount, entity.previousCount)}`,
                  "Traces",
                ];
              }}
            />
            <Bar
              dataKey="traceCount"
              radius={[0, 6, 6, 0]}
              onClick={(entry) => {
                const userId = (entry as { userId?: string | null }).userId;
                if (userId) onSelectUser(userId);
              }}
            >
              {bars.map((entity) => (
                <Cell key={entity.key} fill={SOURCE_COLOR[entity.source]} cursor={entity.userId ? "pointer" : "default"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </article>
  );
}

export function TenantChart({
  rows,
}: {
  rows: { name: string; traceCount: number; previousCount: number }[];
}) {
  return (
    <article className="card chart-card">
      <header>
        <h2>Traces par tenant</h2>
        <p>Organisations qui portent l’usage, avec la variation.</p>
      </header>
      {rows.length === 0 ? (
        <p className="empty">Aucune trace sur cette période.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 32)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#e6dfd4" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: "#5c564e", fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tickFormatter={(value: string) => shorten(value, 18)}
              tick={{ fill: "#1a1814", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, _name, item) => {
                const row = item.payload as { traceCount: number; previousCount: number };
                return [
                  `${formatCount(Number(value))} · ${formatChange(row.traceCount, row.previousCount)}`,
                  "Traces",
                ];
              }}
            />
            <Bar dataKey="traceCount" fill="#2f4a6b" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </article>
  );
}
