import { Badge } from "@/components/ui/badge";
import type { Owned } from "@/features/workflows";
import { ownerCell, type DataColumn } from "@/shared/components/DataTable";
import type { CsvColumn } from "@/shared/csv";
import { formatDateTime } from "@/shared/format";
import type { ActivityItem } from "@/shared/insightTypes";

const ACTION_LABELS: Record<string, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function actorName(row: ActivityItem): string {
  if (row.actorType === "API_KEY") return "Clé API";
  return row.actorName || row.actorEmail || "Utilisateur inconnu";
}

export const ACTIVITY_COLUMNS: DataColumn<Owned<ActivityItem>>[] = [
  { header: "Date", render: (row) => formatDateTime(row.createdAt) },
  {
    header: "Auteur",
    render: (row) => (
      <>
        <span className="block font-medium">{actorName(row)}</span>
        <span className="block text-xs text-muted-foreground">
          {row.actorType === "API_KEY" ? row.apiKeyId : row.actorEmail}
        </span>
      </>
    ),
  },
  {
    header: "Action",
    render: (row) => (
      <Badge variant={row.action === "delete" ? "destructive" : "outline"}>{actionLabel(row.action)}</Badge>
    ),
  },
  {
    header: "Ressource",
    render: (row) => (
      <>
        <span className="block font-medium">{row.resourceType}</span>
        <code className="mt-1 block max-w-64 truncate text-xs text-muted-foreground">{row.resourceId}</code>
      </>
    ),
  },
  { header: "Projet de", render: ownerCell },
];

export const ACTIVITY_CSV: CsvColumn<Owned<ActivityItem>>[] = [
  { header: "Date", value: (row) => row.createdAt },
  { header: "Auteur", value: actorName },
  { header: "Email auteur", value: (row) => row.actorEmail },
  { header: "Type auteur", value: (row) => row.actorType },
  { header: "Action", value: (row) => row.action },
  { header: "Ressource", value: (row) => row.resourceType },
  { header: "ID ressource", value: (row) => row.resourceId },
  { header: "Propriétaire", value: (row) => row.ownerName },
  { header: "User ID", value: (row) => row.userId },
  { header: "Tenant", value: (row) => row.ownerTenant },
  { header: "Projet", value: (row) => row.projectId },
];
