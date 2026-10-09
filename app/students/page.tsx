import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { DirectoryToolbar } from "@/components/students/directory-toolbar"
import { DirectoryTable } from "@/components/students/directory-table"
import { DirectoryPagination } from "@/components/students/directory-pagination"
import { TableSkeleton } from "@/components/queue/queue-skeleton"
import { EmptyDatabase } from "@/components/shared/empty-database"
import { getAdvisors, getMajors, getRecordCounts, getStudents } from "@/lib/data"
import { getSelectedAdvisor } from "@/lib/advisor"
import { ALL_ADVISORS, PAGE_SIZE } from "@/lib/config"
import { parseDirectoryParams, type SearchParams } from "@/lib/search-params"

export const metadata: Metadata = { title: "Students" }

export default async function StudentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, cookieAdvisor, advisors, majors] = await Promise.all([
    searchParams,
    getSelectedAdvisor(),
    getAdvisors(),
    getMajors(),
  ])
  const { advisor_param, page, ...filters } = parseDirectoryParams(params)
  const advisorValue = advisor_param ?? cookieAdvisor ?? ALL_ADVISORS
  const advisor = advisorValue === ALL_ADVISORS ? null : advisorValue
  const hasFilters = Boolean(
    filters.q ||
      filters.major ||
      filters.class_years?.length ||
      filters.risks?.length ||
      filters.last_contact !== "any" ||
      advisor_param,
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Students" description="Every student in the advising caseload. Filters are saved in the URL." />
      <section aria-labelledby="directory-heading" className="rounded-lg border border-border bg-card">
        <h2 id="directory-heading" className="sr-only">
          Student directory
        </h2>
        <DirectoryToolbar
          advisors={advisors}
          majors={majors}
          advisor={advisorValue}
          q={filters.q ?? ""}
          major={filters.major}
          classYears={filters.class_years ?? []}
          risks={filters.risks ?? []}
          lastContact={filters.last_contact ?? "any"}
          hasFilters={hasFilters}
        />
        <Suspense
          key={JSON.stringify({ filters, advisor, page })}
          fallback={<TableSkeleton label="Loading students" columns={9} />}
        >
          <DirectoryResults filters={{ ...filters, advisor }} page={page} params={params} />
        </Suspense>
      </section>
    </div>
  )
}

async function DirectoryResults({
  filters,
  page,
  params,
}: {
  filters: Parameters<typeof getStudents>[0] & {}
  page: number
  params: SearchParams
}) {
  const [students, everyone, counts] = await Promise.all([
    getStudents(filters),
    getStudents({ advisor: filters.advisor }),
    getRecordCounts(),
  ])
  if (counts.students === 0) return <EmptyDatabase />
  const pageCount = Math.max(1, Math.ceil(students.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * PAGE_SIZE
  const rows = students.slice(start, start + PAGE_SIZE)

  return (
    <>
      <DirectoryTable students={rows} sort={filters.sort ?? "name"} dir={filters.dir ?? "asc"} />
      <DirectoryPagination
        params={params}
        page={current}
        pageCount={pageCount}
        shown={rows.length}
        total={students.length}
        overall={everyone.length}
        rangeStart={start + 1}
      />
    </>
  )
}
