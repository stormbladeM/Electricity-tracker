"use client";

import { Download } from "lucide-react";
import { datedFilename, downloadCsv, toCsv, type CsvValue } from "./export-csv";

/**
 * "Export CSV" for whatever table is on screen.
 *
 * `rows` is a function rather than an array so nothing is serialised until
 * somebody actually clicks — a 774-row coverage export should not be built on
 * every render of the page it sits on.
 *
 * What it exports is exactly what was read: the same rows the table is showing,
 * with the same filters applied. An export that quietly returns a different
 * slice from the screen it was launched from is how people end up arguing about
 * two spreadsheets.
 */
export function ExportButton({
  stem,
  columns,
  rows,
  disabled,
}: {
  /** Filename stem; the date is appended. */
  stem: string;
  columns: readonly string[];
  rows: () => CsvValue[][];
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => downloadCsv(datedFilename(stem), toCsv(columns, rows()))}
      className="flex shrink-0 items-center gap-2 rounded border border-hairline px-3 py-1.5 text-14 text-text hover:border-text-muted disabled:opacity-50"
    >
      <Download aria-hidden="true" size={16} strokeWidth={1.5} />
      Export CSV
    </button>
  );
}
