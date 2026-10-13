import { useMemo, useState } from "react";
import { changeTone, formatChange, formatCount, formatDateTime, formatPercent } from "./format";
import { isDeclining, STATUS_META, type UsageEntity } from "./metrics";

type Filter = "all" | "auth" | "local" | "watch";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "auth", label: "Comptes auth" },
  { value: "local", label: "Hors auth" },
  { value: "watch", label: "À surveiller" },
];

type UsageTableProps = {
  entities: UsageEntity[];
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
};

function matches(entity: UsageEntity, filter: Filter): boolean {
  if (filter === "auth") return entity.source === "auth";
  if (filter === "local") return entity.source === "local";
  if (filter === "watch") return isDeclining(entity);
  return true;
}

export function UsageTable({ entities, selectedUserId, onSelectUser }: UsageTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entities.filter(
      (entity) =>
        matches(entity, filter) &&
        (!needle ||
          entity.name.toLowerCase().includes(needle) ||
          (entity.tenantName ?? "").toLowerCase().includes(needle)),
    );
  }, [entities, filter, query]);

  return (
    <section className="card table-card">
      <header className="table-head">
        <div>
          <h2>Utilisateurs et projets</h2>
          <p>{formatCount(visible.length)} lignes · un clic sur un compte auth filtre l’évolution.</p>
        </div>
        <div className="table-tools">
          <div className="tabs">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={filter === option.value ? "active" : undefined}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Nom ou tenant"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </header>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Tenant</th>
              <th className="num">Traces</th>
              <th className="num">Période préc.</th>
              <th className="num">Variation</th>
              <th className="num">Part</th>
              <th>Dernière trace</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entity) => {
              const selected = entity.userId !== null && entity.userId === selectedUserId;
              const meta = STATUS_META[entity.status];
              return (
                <tr
                  key={entity.key}
                  className={`${selected ? "selected" : ""}${entity.userId ? " clickable" : ""}`}
                  onClick={() => {
                    if (!entity.userId) return;
                    onSelectUser(selected ? null : entity.userId);
                  }}
                >
                  <td>
                    <strong>{entity.name}</strong>
                    <span className={`badge ${entity.source}`}>
                      {entity.source === "auth" ? "Compte auth" : "Projet hors auth"}
                      {entity.projectCount > 1 ? ` · ${entity.projectCount} projets` : ""}
                    </span>
                  </td>
                  <td>{entity.tenantName || "—"}</td>
                  <td className="num count">{formatCount(entity.traceCount)}</td>
                  <td className="num muted">{formatCount(entity.previousCount)}</td>
                  <td className={`num change ${changeTone(entity.traceCount, entity.previousCount)}`}>
                    {formatChange(entity.traceCount, entity.previousCount)}
                  </td>
                  <td className="num">{entity.traceCount > 0 ? formatPercent(entity.share) : "—"}</td>
                  <td>{formatDateTime(entity.lastTraceAt)}</td>
                  <td>
                    <span className="status">
                      <i style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 ? <p className="empty">Aucune ligne pour ce filtre.</p> : null}
      </div>
    </section>
  );
}
