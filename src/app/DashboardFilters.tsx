import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPicker, type UserOption } from "@/features/users";
import { defaultToDate, formatTime, presetFromDate } from "@/shared/format";
import type { Granularity } from "@/shared/types";
import type { DashboardParams } from "./useDashboardParams";

const PRESETS = [7, 30, 90];

type DashboardFiltersProps = {
  params: DashboardParams;
  onChange: (patch: Partial<DashboardParams>) => void;
  userOptions: UserOption[];
  onSelectUser: (userId: string) => void;
  onClearUser: () => void;
  busy: boolean;
  loadedAt: Date | null;
  onRefresh: () => void;
};

export function DashboardFilters(props: DashboardFiltersProps) {
  const { params, onChange } = props;
  const today = defaultToDate();

  return (
    <section className="relative flex flex-wrap items-end gap-3" aria-label="Filtres">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Période rapide">
        {PRESETS.map((days) => {
          const active = params.to === today && params.from === presetFromDate(days);
          return (
            <Button
              key={days}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => onChange({ from: presetFromDate(days), to: today })}
            >
              {days} jours
            </Button>
          );
        })}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="from">Du</Label>
        <Input
          id="from"
          type="date"
          className="w-40"
          value={params.from}
          max={params.to}
          onChange={(event) => onChange({ from: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="to">Au</Label>
        <Input
          id="to"
          type="date"
          className="w-40"
          value={params.to}
          min={params.from}
          max={today}
          onChange={(event) => onChange({ to: event.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="granularity">Granularité</Label>
        <Select
          value={params.granularity}
          onValueChange={(value) => onChange({ granularity: value as Granularity })}
        >
          <SelectTrigger id="granularity" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hour">Heure</SelectItem>
            <SelectItem value="day">Jour</SelectItem>
            <SelectItem value="week">Semaine</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <UserPicker
        options={props.userOptions}
        selectedUserId={params.userId}
        onSelect={props.onSelectUser}
        onClear={props.onClearUser}
      />
      <div className="ml-auto grid justify-items-end gap-1">
        <Button type="button" variant="outline" size="sm" onClick={props.onRefresh} disabled={props.busy}>
          <RefreshCwIcon className={props.busy ? "animate-spin" : undefined} />
          {props.busy ? "Chargement…" : "Rafraîchir"}
        </Button>
        <small className="text-xs text-muted-foreground">
          {props.loadedAt ? `Mis à jour à ${formatTime(props.loadedAt)}` : "Pas encore chargé"}
        </small>
      </div>
    </section>
  );
}
