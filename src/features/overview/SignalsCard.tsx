import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatChange, formatCount } from "@/shared/format";
import type { UsageEntity } from "./metrics";

const VISIBLE = 6;

type SignalsCardProps = {
  declining: UsageEntity[];
  fresh: UsageEntity[];
  unusedAuth: UsageEntity[];
};

export function SignalsCard({ declining, fresh, unusedAuth }: SignalsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">Décisions à prendre</CardTitle>
        <CardDescription>Comparé à la période précédente de même durée.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <SignalList
          title="Relancer"
          hint="Forte baisse ou arrêt"
          tone="warn"
          entities={declining}
          value={(entity) =>
            `${formatCount(entity.previousCount)} → ${formatCount(entity.traceCount)} (${formatChange(entity.traceCount, entity.previousCount)})`
          }
        />
        <SignalList
          title="Accompagner"
          hint="Nouveaux usages sur la période"
          tone="good"
          entities={fresh}
          value={(entity) => `${formatCount(entity.traceCount)} traces`}
        />
        <SignalList
          title="Activer"
          hint="Comptes auth jamais utilisés sur les deux périodes"
          tone="muted"
          entities={unusedAuth}
          value={(entity) => entity.tenantName || "Sans tenant"}
        />
      </CardContent>
    </Card>
  );
}

function SignalList(props: {
  title: string;
  hint: string;
  tone: "warn" | "good" | "muted";
  entities: UsageEntity[];
  value: (entity: UsageEntity) => string;
}) {
  const rest = props.entities.length - VISIBLE;
  return (
    <div
      className={cn(
        "grid content-start gap-1 border-l-4 pl-3",
        props.tone === "warn" && "border-l-destructive",
        props.tone === "good" && "border-l-primary",
        props.tone === "muted" && "border-l-previous",
      )}
    >
      <h3 className="font-heading text-base">
        {props.title} <span className="font-sans text-sm font-semibold text-muted-foreground">{formatCount(props.entities.length)}</span>
      </h3>
      <p className="text-xs text-muted-foreground">{props.hint}</p>
      {props.entities.length === 0 ? <p className="py-2 text-sm text-muted-foreground">Rien à signaler.</p> : null}
      <ul className="mt-2 grid gap-2">
        {props.entities.slice(0, VISIBLE).map((entity) => (
          <li key={entity.key} className="grid">
            <strong className="text-sm">{entity.name}</strong>
            <small className="text-xs text-muted-foreground">{props.value(entity)}</small>
          </li>
        ))}
      </ul>
      {rest > 0 ? <p className="mt-1 text-xs text-muted-foreground">et {formatCount(rest)} autres dans le tableau</p> : null}
    </div>
  );
}
