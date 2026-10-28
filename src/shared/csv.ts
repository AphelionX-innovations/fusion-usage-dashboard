export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

const SEPARATOR = ";";
const NEEDS_QUOTES = /[";\n\r]/;

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? String(value).replace(".", ",") : value;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv<T>(params: { filename: string; columns: CsvColumn<T>[]; rows: T[] }) {
  const lines = [
    params.columns.map((column) => cell(column.header)).join(SEPARATOR),
    ...params.rows.map((row) => params.columns.map((column) => cell(column.value(row))).join(SEPARATOR)),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = params.filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function csvFilename(name: string, period: { from: string; to: string }): string {
  return `fusion-${name}_${period.from}_${period.to}.csv`;
}
