import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCount } from "@/shared/format";

export type UserOption = {
  userId: string;
  name: string;
  tenantName: string | null;
  traceCount: number;
};

type UserPickerProps = {
  options: UserOption[];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
  onClear: () => void;
};

export function UserPicker({ options, selectedUserId, onSelect, onClear }: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.userId === selectedUserId) ?? null;
  const sorted = useMemo(
    () => [...options].sort((left, right) => right.traceCount - left.traceCount || left.name.localeCompare(right.name)),
    [options],
  );

  return (
    <div className="grid gap-1.5">
      <Label>Utilisateur</Label>
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-56 justify-between font-normal">
              <span className="truncate">{selected ? selected.name : "Tous les utilisateurs"}</span>
              <ChevronsUpDownIcon className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Nom, tenant ou identifiant" />
              <CommandList>
                <CommandEmpty>Aucun compte ne correspond.</CommandEmpty>
                <CommandGroup>
                  {sorted.map((option) => (
                    <CommandItem
                      key={option.userId}
                      value={`${option.name} ${option.tenantName ?? ""} ${option.userId}`}
                      data-checked={option.userId === selectedUserId}
                      onSelect={() => {
                        onSelect(option.userId);
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{option.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {option.tenantName || "Sans tenant"}
                        </span>
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{formatCount(option.traceCount)}</span>
                      <CheckIcon className={cn("opacity-0", option.userId === selectedUserId && "opacity-100")} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selected ? (
          <Button type="button" variant="ghost" size="icon" aria-label="Retirer le filtre utilisateur" onClick={onClear}>
            <XIcon />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
