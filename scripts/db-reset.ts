/**
 * Empties the database (keeping its structure) so the importer can be tried from a clean start
 * (DECISIONS P1). The app won't re-seed on its own afterwards; run `npm run seed` to bring the
 * sample data back. Uses DATABASE_URL if set, otherwise data/app.db.
 *
 *   npm run db:reset
 */
import { createDb, describeDb, resolveDbConfig } from "@/lib/db/client"
import { clearData, markInitialized, migrateToLatest } from "@/lib/db/setup"

async function main() {
  const config = resolveDbConfig()
  const db = createDb(config)
  try {
    await migrateToLatest(db)
    await clearData(db)
    await markInitialized(db)
    console.log(`${describeDb(config)} is now empty. Import data on the Import page, or run "npm run seed" for the sample data.`)
  } finally {
    await db.destroy()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
