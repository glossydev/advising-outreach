import Link from "next/link"
import { DatabaseZap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "./page-header"

/** Shown instead of an empty table when the database has no students at all (e.g. after a reset). */
export function EmptyDatabase() {
  return (
    <EmptyState
      icon={DatabaseZap}
      title="No students yet"
      description="The database is empty. Import a students file to get started, then their contact notes."
      action={
        <Button variant="signal" nativeButton={false} render={<Link href="/import" />}>
          Import data
        </Button>
      }
    />
  )
}
