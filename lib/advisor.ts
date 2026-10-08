import "server-only"
import { cookies } from "next/headers"
import { ADVISOR_COOKIE, ALL_ADVISORS } from "./config"

/** Returns the advisor chosen in the top bar, or null for "All advisors". */
export async function getSelectedAdvisor(): Promise<string | null> {
  const value = (await cookies()).get(ADVISOR_COOKIE)?.value
  return value && value !== ALL_ADVISORS ? value : null
}
