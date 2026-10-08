import { describe, expect, it } from "vitest"
import { parseCsv } from "@/lib/import/csv"

describe("parseCsv", () => {
  it("keeps values exactly as written: no trimming, no conversion", () => {
    const { headers, records } = parseCsv('id,name,date\nS1, Maya ,"Aug 25, 2026"\n')
    expect(headers).toEqual(["id", "name", "date"])
    expect(records).toEqual([["S1", " Maya ", "Aug 25, 2026"]])
  })

  it("treats any line ending as the end of a row, even mixed in one file", () => {
    // Header ends with \n, the data rows with \r\n and \r, as happens when a file is edited on different systems.
    const { records } = parseCsv("id,risk\nS1,Low\r\nS2,High\rS3,Medium")
    expect(records).toEqual([
      ["S1", "Low"],
      ["S2", "High"],
      ["S3", "Medium"],
    ])
  })

  it("strips a byte-order mark and skips blank lines", () => {
    const { headers, records } = parseCsv("﻿id,name\n\nS1,Maya\n,\n")
    expect(headers).toEqual(["id", "name"])
    expect(records).toEqual([["S1", "Maya"]])
  })

  it("pads short rows so every column has a value", () => {
    expect(parseCsv("a,b,c\n1,2\n").records).toEqual([["1", "2", ""]])
  })
})
