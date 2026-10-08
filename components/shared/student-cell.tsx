import Link from "next/link"
import type { Student } from "@/lib/types"
import { fullName } from "@/lib/format"

export function StudentCell({
  student,
  linked = true,
}: {
  student: Pick<Student, "student_id" | "first_name" | "last_name" | "major">
  linked?: boolean
}) {
  const name = fullName(student)
  return (
    <div className="flex min-w-0 flex-col leading-tight">
      {linked ? (
        <Link
          href={`/students/${student.student_id}`}
          className="truncate font-medium text-navy hover:text-azurite hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </Link>
      ) : (
        <span className="truncate font-medium text-navy">{name}</span>
      )}
      <span className="truncate text-[13px] text-muted-foreground">
        <span className="font-mono tabular-nums">{student.student_id}</span> · {student.major}
      </span>
    </div>
  )
}
