import { classStandingRange } from "../fields"
import type { Rule } from "../types"
import { activeRows, makeIssue, valueOf } from "./helpers"

/** D11: credits outside the UA class-standing range for the class year. Either value may be wrong. */
export const creditsOutsideClassStanding: Rule = {
  name: "credits_outside_class_standing",
  decision: "D11",
  kinds: ["students"],
  check(rows) {
    return activeRows(rows).flatMap((row) => {
      const credits = valueOf(row, "credits_earned")
      const year = valueOf(row, "class_year")
      const range = classStandingRange(year)
      if (!range || !/^\d+$/.test(credits)) return []
      const [min, max] = range
      const n = Number(credits)
      if (n >= min && (max === null || n <= max)) return []
      const expected = max === null ? `${min}+` : `${min}–${max}`
      return [
        makeIssue(
          "credits_outside_class_standing",
          "warning",
          row,
          "credits_earned",
          `${n} credits is outside the usual range for a ${year} (${expected}, by UA class standing). Check the credits or the class year.`,
          { value: credits },
        ),
      ]
    })
  },
}
