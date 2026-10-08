"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { ADVISOR_COOKIE, ALL_ADVISORS } from "@/lib/config"
import { getAdvisors } from "@/lib/data"

/**
 * Remembers which advisor's caseload to show. A view preference stored in a cookie, not data;
 * data changes (logging notes, importing) go through the API routes.
 */
export async function setAdvisorAction(advisor: string) {
  const advisors = await getAdvisors()
  const value = advisors.includes(advisor) ? advisor : ALL_ADVISORS
  ;(await cookies()).set(ADVISOR_COOKIE, value, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 180 })
  revalidatePath("/", "layout")
}
