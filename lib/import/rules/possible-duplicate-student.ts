import { lettersOnly, levenshtein } from "../text"
import type { Rule } from "../types"
import { activeRows, makeIssue, valueOf } from "./helpers"

interface Person {
  id: string
  first: string
  last: string
  major: string
  classYear: string
  advisor: string
  label: string
}

/** "grace" / "gracie", "jon" / "john", "alex" / "alexander". */
function similarFirstNames(a: string, b: string): boolean {
  if (!a || !b) return false
  return levenshtein(a, b) <= 2 || a.startsWith(b) || b.startsWith(a)
}

/**
 * D15: same last name, first names within two letters, and the same major or class year, under a
 * different ID. Never merged automatically: the person can link the two as possible duplicates,
 * keep the row as is, or exclude it. Within a file, the later row is the one flagged.
 */
export const possibleDuplicateStudent: Rule = {
  name: "possible_duplicate_student",
  decision: "D15",
  kinds: ["students"],
  check(rows, ctx) {
    const people: Person[] = [...ctx.existing.students.values()].map((s) => ({
      id: s.student_id,
      first: lettersOnly(s.first_name),
      last: lettersOnly(s.last_name),
      major: s.major.trim().toLowerCase(),
      classYear: s.class_year.trim(),
      advisor: s.advisor,
      label: `${s.student_id} ${s.first_name} ${s.last_name} (${s.major}, ${s.class_year}, advisor ${s.advisor})`,
    }))
    return activeRows(rows).flatMap((row) => {
      const me: Person = {
        id: valueOf(row, "student_id").trim(),
        first: lettersOnly(valueOf(row, "first_name")),
        last: lettersOnly(valueOf(row, "last_name")),
        major: valueOf(row, "major").trim().toLowerCase(),
        classYear: valueOf(row, "class_year").trim(),
        advisor: valueOf(row, "advisor").trim(),
        label: "",
      }
      me.label = `${me.id} ${valueOf(row, "first_name").trim()} ${valueOf(row, "last_name").trim()} (${valueOf(row, "major").trim()}, ${me.classYear}, advisor ${me.advisor})`
      const match = people.find(
        (p) =>
          p.id !== me.id &&
          p.last !== "" &&
          p.last === me.last &&
          p.first !== me.first &&
          similarFirstNames(p.first, me.first) &&
          (p.major === me.major || p.classYear === me.classYear),
      )
      people.push(me)
      if (!match || valueOf(row, "possible_duplicate_of") === match.id) return []
      return [
        makeIssue("possible_duplicate_student", "warning", row, undefined, `May be the same person as ${match.label}.`, {
          suggestions: [
            { label: `Import and link to ${match.id} as a possible duplicate`, set: { possible_duplicate_of: match.id } },
          ],
        }),
      ]
    })
  },
}
