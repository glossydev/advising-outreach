/**
 * Wipes the database and imports the sample data through the normal import, accepting every
 * recommended fix (DECISIONS T5). Uses DATABASE_URL if set, otherwise data/app.db.
 *
 *   npm run seed
 */
import { createDb, describeDb, resolveDbConfig } from "@/lib/db/client"
import { clearData, markInitialized, migrateToLatest } from "@/lib/db/setup"
import { seedSampleData } from "@/lib/services/seed"

async function main() {
  const config = resolveDbConfig()
  const db = createDb(config)
  try {
    console.log(`Seeding ${describeDb(config)} from data/source/ …`)
    await migrateToLatest(db)
    await clearData(db)
    const result = await seedSampleData(db)
    await markInitialized(db)
    for (const r of Object.values(result)) {
      console.log(`  ${r.kind}: ${r.added} added, ${r.excluded} excluded`)
      for (const [rule, count] of Object.entries(r.fixesByRule).sort()) console.log(`    ${rule}: ${count}`)
    }
    console.log("Done.")
  } finally {
    await db.destroy()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
