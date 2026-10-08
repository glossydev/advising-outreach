import { parse } from "csv-parse/sync"

export interface CsvTable {
  headers: string[]
  /** Data rows, as found. Rows with fewer cells than headers are padded with "". */
  records: string[][]
}

/** Parses CSV text without changing any value: no trimming, no type conversion. */
export function parseCsv(text: string): CsvTable {
  const rows = parse(text, {
    bom: true,
    // Any line ending ends a row, even when a file mixes them (edited on Windows and a Mac, say).
    // Otherwise a stray "\r" sticks to the last value of a row.
    record_delimiter: ["\r\n", "\n", "\r"],
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
  }) as string[][]
  const [headers = [], ...rest] = rows
  const records = rest
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells) => (cells.length < headers.length ? [...cells, ...Array(headers.length - cells.length).fill("")] : cells))
  return { headers, records }
}
