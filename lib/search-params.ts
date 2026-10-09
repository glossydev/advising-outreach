import { CLASS_YEARS, RISK_FLAGS } from "./import/fields"
import type {
  ClassYear,
  LastContactFilter,
  OutreachQueueFilters,
  QueueSortKey,
  RiskFlag,
  SortDirection,
  StudentFilters,
  StudentSortKey,
} from "./types"

/** The direction a queue column sorts in when first clicked: the order an advisor would want first. */
export const QUEUE_SORT_DEFAULT_DIR: Record<QueueSortKey, SortDirection> = {
  rank: "asc",
  name: "asc",
  risk: "desc",
  last_contact: "asc",
  follow_up: "asc",
  score: "desc",
}
const QUEUE_SORT_KEYS = Object.keys(QUEUE_SORT_DEFAULT_DIR) as QueueSortKey[]

export type SearchParams = Record<string, string | string[] | undefined>

export { CLASS_YEARS, RISK_FLAGS }
export const MIN_DAY_OPTIONS = [14, 30, 60, 90] as const
const LAST_CONTACT: LastContactFilter[] = ["any", "30", "60", "90", "none"]
const SORT_KEYS: StudentSortKey[] = [
  "student_id",
  "name",
  "major",
  "class_year",
  "credits",
  "gpa",
  "advisor",
  "last_contact",
  "risk",
  "score",
]

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Comma-separated list param, filtered to allowed values. */
function list<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T[] {
  const raw = first(value)
  if (!raw) return []
  return raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v))
}

export function parseQueueParams(params: SearchParams): Omit<OutreachQueueFilters, "advisor"> {
  const minDays = Number(first(params.min_days))
  const sortParam = first(params.sort) as QueueSortKey | undefined
  const sort = sortParam && QUEUE_SORT_KEYS.includes(sortParam) ? sortParam : "rank"
  const dir = first(params.dir)
  return {
    risks: list<RiskFlag>(params.risk, RISK_FLAGS),
    class_years: list<ClassYear>(params.year, CLASS_YEARS),
    min_days: (MIN_DAY_OPTIONS as readonly number[]).includes(minDays) ? minDays : undefined,
    sort,
    dir: dir === "asc" || dir === "desc" ? dir : QUEUE_SORT_DEFAULT_DIR[sort],
  }
}

export function parseDirectoryParams(params: SearchParams): Omit<StudentFilters, "advisor"> & {
  advisor_param?: string
  page: number
} {
  const lastContact = first(params.last_contact) as LastContactFilter | undefined
  const sort = first(params.sort) as StudentSortKey | undefined
  const dir = first(params.dir) as SortDirection | undefined
  const page = Math.max(1, Math.floor(Number(first(params.page)) || 1))
  return {
    q: first(params.q)?.slice(0, 100) ?? "",
    major: first(params.major) || undefined,
    class_years: list<ClassYear>(params.year, CLASS_YEARS),
    risks: list<RiskFlag>(params.risk, RISK_FLAGS),
    last_contact: lastContact && LAST_CONTACT.includes(lastContact) ? lastContact : "any",
    sort: sort && SORT_KEYS.includes(sort) ? sort : "name",
    dir: dir === "desc" ? "desc" : "asc",
    advisor_param: first(params.advisor) || undefined,
    page,
  }
}
