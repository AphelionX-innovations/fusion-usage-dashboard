import type { KeyboardEvent, ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCount } from "@/shared/format";

export type DataColumn<T> = {
  header: string;
  numeric?: boolean;
  muted?: boolean;
  render: (row: T) => ReactNode;
  csv?: (row: T) => string | number | null | undefined;
};

type DataTableProps<T> = {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  rowUserId?: (row: T) => string | null;
  selectedUserId?: string | null;
  onSelectUser?: (userId: string) => void;
  empty: string;
};

export function DataTable<T>(props: DataTableProps<T>) {
  const { rows, columns, selectedUserId, onSelectUser } = props;

  function rowProps(row: T) {
    const userId = props.rowUserId?.(row) ?? null;
    const clickable = userId !== null && onSelectUser !== undefined;
    const selected = userId !== null && userId === selectedUserId;
    return {
      "data-state": selected ? "selected" : undefined,
      className: cn(clickable && "cursor-pointer", selected && "bg-accent"),
      tabIndex: clickable ? 0 : undefined,
      onClick: () => {
        if (clickable) onSelectUser(userId);
      },
      onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
        if (event.key === "Enter" && clickable) onSelectUser(userId);
      },
    };
  }

  return (
    <div className="grid gap-3">
      <div className="max-h-[560px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.header} className={cn(column.numeric && "text-right")}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={props.rowKey(row)} {...rowProps(row)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.header}
                    className={cn(
                      column.numeric ? "text-right tabular-nums" : "whitespace-normal",
                      column.muted && "text-muted-foreground",
                    )}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{props.empty}</p> : null}
    </div>
  );
}

export function ownerCell(row: { ownerName: string; ownerTenant: string | null }) {
  return (
    <>
      <span className="block font-medium">{row.ownerName}</span>
      <span className="block text-xs text-muted-foreground">{row.ownerTenant || "Sans tenant"}</span>
    </>
  );
}

export function errorCount(count: number) {
  return (
    <span className={count > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>{formatCount(count)}</span>
  );
}
