import { describe, expect, it } from "vitest"
import { daysBetween, formatLongDate, readDate } from "@/lib/import/dates"

describe("readDate", () => {
  it.each([
    ["2026-09-18", "2026-09-18", true],
    ["Aug 25, 2026", "2026-08-25", false],
    ["Sep 05, 2026", "2026-09-05", false],
    ["30-Aug-2026", "2026-08-30", false],
    ["2026/09/02", "2026-09-02", false],
    ["09/16/2026", "2026-09-16", false],
    ["16/09/2026", "2026-09-16", false],
    ["September 5 2026", "2026-09-05", false],
    ["2026-09-18T10:30:00Z", "2026-09-18", false],
    [" 2026-09-18", "2026-09-18", false],
  ])("reads %j as %s (already ISO: %s)", (raw, iso, isIso) => {
    expect(readDate(raw)).toMatchObject({ kind: "date", iso, isIso })
  })

  it("treats blanks and placeholders separately", () => {
    expect(readDate("  ").kind).toBe("blank")
    expect(readDate("N/A").kind).toBe("placeholder")
    expect(readDate("tbd").kind).toBe("placeholder")
  })

  it("refuses to guess between month-first and day-first", () => {
    expect(readDate("03/04/2026")).toEqual({ kind: "ambiguous", monthFirst: "2026-03-04", dayFirst: "2026-04-03" })
    expect(readDate("05/05/2026")).toMatchObject({ kind: "date", iso: "2026-05-05" })
  })

  it("rejects dates that aren't real", () => {
    expect(readDate("2026-02-30").kind).toBe("unreadable")
    expect(readDate("Foo 12, 2026").kind).toBe("unreadable")
    expect(readDate("sometime in May").kind).toBe("unreadable")
  })
})

describe("date helpers", () => {
  it("formats and counts days in UTC", () => {
    expect(formatLongDate("2026-08-25")).toBe("Aug 25, 2026")
    expect(daysBetween("2026-06-02", "2026-10-05")).toBe(125)
  })
})
