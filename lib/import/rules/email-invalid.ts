import type { Rule } from "../types"
import { activeRows, makeIssue, quote, valueOf } from "./helpers"

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** D12: not a usable email address. Spacing alone is left to D14. */
export const emailInvalid: Rule = {
  name: "email_invalid",
  decision: "D12",
  kinds: ["students"],
  check(rows) {
    return activeRows(rows).flatMap((row) => {
      const raw = valueOf(row, "email")
      if (raw.trim() === "" || EMAIL_PATTERN.test(raw.trim())) return []
      return [makeIssue("email_invalid", "error", row, "email", `${quote(raw.trim())} isn't a valid email address.`, { value: raw })]
    })
  },
}
