const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 90;
const MAX_RANGE_MS = MAX_DAYS * DAY_MS;

export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function presetFromDate(days: number): string {
  // Arithmétique en jours calendaires : retirer N×24 h se décale d'un jour autour d'un changement d'heure.
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return isoDate(date);
}

export function defaultFromDate(): string {
  return presetFromDate(30);
}

export function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(value);
}

export function defaultToDate(): string {
  return isoDate(new Date());
}

/** Nombre de jours calendaires, bornes incluses (19/08 → 16/11 = 90). Insensible au changement d'heure. */
function calendarDays(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS) + 1;
}

export function toRangeBounds(fromDate: string, toDate: string) {
  const to = new Date(`${toDate}T23:59:59.999`);
  let from = new Date(`${fromDate}T00:00:00`);
  // Un changement d'heure dans la période ajoute 1 h (ex. 90 j + 1 h) et ferait refuser la requête
  // par l'API (max 90 jours exactement) : on ramène le début à 90 jours pile.
  if (to.getTime() - from.getTime() > MAX_RANGE_MS && calendarDays(fromDate, toDate) <= MAX_DAYS) {
    from = new Date(to.getTime() - MAX_RANGE_MS);
  }
  return { from, to };
}

export function rangeError(fromDate: string, toDate: string): string | null {
  const { from, to } = toRangeBounds(fromDate, toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return "Les dates ne sont pas valides.";
  }
  if (from.getTime() >= to.getTime()) {
    return "La date de début doit être avant la date de fin.";
  }
  if (calendarDays(fromDate, toDate) > MAX_DAYS) {
    return "La période ne peut pas dépasser 90 jours.";
  }
  return null;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatCost(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value > 0 && value < 0.01) return "< 0,01 $";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${formatCount(Math.round(ms / 100) / 10)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "Nouveau" : "—";
  const ratio = (current - previous) / previous;
  return `${ratio > 0 ? "+" : ""}${formatPercent(ratio)}`;
}

export function changeTone(current: number, previous: number): "up" | "down" | "flat" {
  if (current === previous) return "flat";
  return current > previous ? "up" : "down";
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatBucket(value: string, granularity: "hour" | "day" | "week"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function personName(person: {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  userName?: string | null;
}): string {
  const full = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return full || person.userName || person.username || person.email || "Sans nom";
}
