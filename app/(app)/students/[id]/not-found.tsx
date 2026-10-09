import Link from "next/link"
import { UserX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/page-header"

export default function StudentNotFound() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <EmptyState
        icon={UserX}
        titleAs="h1"
        title="Student not found"
        description="No student matches this ID. It may have been merged or removed in the latest import."
        action={
          <Link href="/students" className={buttonVariants({ variant: "outline" })}>
            Back to Students
          </Link>
        }
      />
    </div>
  )
}
