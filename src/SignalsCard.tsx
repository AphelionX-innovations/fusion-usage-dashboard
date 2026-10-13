import { formatChange, formatCount } from "./format";
import type { UsageEntity } from "./metrics";

const VISIBLE = 6;

type SignalsCardProps = {
  declining: UsageEntity[];
  fresh: UsageEntity[];
  unusedAuth: UsageEntity[];
};

export function SignalsCard({ declining, fresh, unusedAuth }: SignalsCardProps) {
  return (
    <section className="card signals">
      <header>
        <h2>Décisions à prendre</h2>
        <p>Comparé à la période précédente de même durée.</p>
      </header>
      <div className="signal-columns">
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
      </div>
    </section>
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
    <div className={`signal ${props.tone}`}>
      <h3>
        {props.title} <span>{formatCount(props.entities.length)}</span>
      </h3>
      <p>{props.hint}</p>
      {props.entities.length === 0 ? <p className="empty">Rien à signaler.</p> : null}
      <ul>
        {props.entities.slice(0, VISIBLE).map((entity) => (
          <li key={entity.key}>
            <strong>{entity.name}</strong>
            <small>{props.value(entity)}</small>
          </li>
        ))}
      </ul>
      {rest > 0 ? <p className="more">et {formatCount(rest)} autres dans le tableau</p> : null}
    </div>
  );
}
