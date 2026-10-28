import { changeTone, formatChange, formatCount, formatPercent } from "@/shared/format";
import { Kpi } from "@/shared/components/Kpi";
import type { UsageSummary } from "./metrics";

const CONCENTRATION_ALERT = 0.8;

export function KpiStrip({ summary }: { summary: UsageSummary }) {
  const trend = changeTone(summary.total, summary.previousTotal);
  const concentrated = summary.topShare !== null && summary.topShare >= CONCENTRATION_ALERT;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        label="Traces sur la période"
        value={formatCount(summary.total)}
        badge={formatChange(summary.total, summary.previousTotal)}
        tone={trend === "down" ? "warn" : trend === "up" ? "good" : undefined}
        detail={`${formatCount(summary.previousTotal)} sur la période précédente · ${formatCount(summary.dailyAverage)} par jour`}
      />
      <Kpi
        label="Adoption des comptes auth"
        value={summary.authUsers > 0 ? formatPercent(summary.activeAuthUsers / summary.authUsers) : "—"}
        tone={summary.authUsers > 0 && summary.activeAuthUsers / summary.authUsers < 0.5 ? "warn" : undefined}
        detail={`${formatCount(summary.activeAuthUsers)} sur ${formatCount(summary.authUsers)} comptes ont envoyé des traces`}
      />
      <Kpi
        label="Concentration top 5"
        value={summary.topShare === null ? "—" : formatPercent(summary.topShare)}
        tone={concentrated ? "warn" : undefined}
        detail={
          concentrated
            ? "L’usage dépend de très peu d’utilisateurs"
            : "Part des traces venant des 5 plus gros utilisateurs"
        }
      />
      <Kpi
        label="À surveiller"
        value={formatCount(summary.watchCount)}
        tone={summary.watchCount > 0 ? "warn" : undefined}
        detail="Baisse de plus de 50 % ou arrêt par rapport à la période précédente"
      />
    </section>
  );
}
