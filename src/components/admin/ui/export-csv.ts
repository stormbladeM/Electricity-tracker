/**
 * CSV export, in the browser.
 *
 * The plan asks for CSV export of logs, faults and aggregates. Everything the
 * panel exports is already loaded and folded in the page, so the export is a
 * Blob and an anchor click rather than a server route — no second query, and
 * nothing to keep in sync with what the table on screen is showing. Whatever
 * is exported is exactly what was read.
 *
 * Escaping: a field is quoted whenever it contains a comma, a quote or a
 * newline, and inner quotes are doubled. Fault descriptions and audit notes
 * are free text written by other people, so this is not optional.
 */
export type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(
  columns: readonly string[],
  rows: readonly CsvValue[][],
): string {
  return [columns, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

/** Triggers the browser's own save dialog for the given CSV text. */
export function downloadCsv(filename: string, csv: string): void {
  // ﻿: without the byte-order mark, Excel opens UTF-8 CSV as the local
  // codepage and mangles the names of half the LGAs in the country.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/** "audit-log-2026-08-27.csv" — dated so two exports never collide. */
export function datedFilename(stem: string): string {
  return `${stem}-${new Date().toISOString().slice(0, 10)}.csv`;
}
