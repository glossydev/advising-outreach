import type { Metadata } from "next"
import { HelpCenter } from "@/components/help/help-center"
import { getHelpSections } from "@/lib/help"

export const metadata: Metadata = {
  title: "Help · Advising Outreach",
  description: "How to use Advising Outreach: the outreach queue, student pages, logging contacts, importing data and the data quality report.",
}

/** The help pages sit outside the app shell, so they open cleanly in their own tab. */
export default function HelpPage() {
  return <HelpCenter sections={getHelpSections()} />
}
