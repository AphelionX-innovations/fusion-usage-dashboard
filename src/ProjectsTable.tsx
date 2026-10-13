import { useMemo, useState } from "react";
import { formatCount, formatDateTime } from "./format";
import type { UsageProject } from "./types";

type ProjectsTableProps = {
  projects: UsageProject[];
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
};

export function ProjectsTable({
  projects,
  selectedUserId,
  onSelectUser,
}: ProjectsTableProps) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) =>
      [project.userName, project.userId, project.tenantName, project.tenantId, project.projectId]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [projects, query]);

  return (
    <section className="card table-card">
      <header className="table-head">
        <div>
          <h2>Projets</h2>
          <p>{formatCount(visible.length)} affichés, y compris ceux sans compte auth.</p>
        </div>
        <input
          type="search"
          placeholder="Nom, tenant, identifiant"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </header>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Tenant</th>
              <th>Projet</th>
              <th>Traces</th>
              <th>Dernière trace</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((project) => {
              const selected = project.userId !== null && project.userId === selectedUserId;
              return (
                <tr
                  key={project.projectId}
                  className={selected ? "selected" : undefined}
                  onClick={() => {
                    if (!project.userId) return;
                    onSelectUser(selected ? null : project.userId);
                  }}
                >
                  <td>
                    <strong>{project.userName || "Sans nom"}</strong>
                    <span>{project.userId || "Non lié à auth"}</span>
                  </td>
                  <td>
                    <strong>{project.tenantName || "—"}</strong>
                    <span>{project.tenantId || "—"}</span>
                  </td>
                  <td className="mono">{project.projectId}</td>
                  <td className="count">{formatCount(project.traceCount)}</td>
                  <td>{formatDateTime(project.lastTraceAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
