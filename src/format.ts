const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_MS = 90 * DAY_MS;

export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function defaultFromDate(): string {
  return isoDate(new Date(Date.now() - 30 * DAY_MS));
}

export function defaultToDate(): string {
  return isoDate(new Date());
}

export function toRangeBounds(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T23:59:59.999`);
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
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return "La période ne peut pas dépasser 90 jours.";
  }
  return null;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
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
