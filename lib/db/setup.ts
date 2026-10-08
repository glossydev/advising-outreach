import { Migrator } from "kysely/migration"
import { seedSampleData } from "@/lib/services/seed"
import type { Db } from "./client"
import { MIGRATIONS } from "./migrations"

export async function migrateToLatest(db: Db): Promise<void> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => MIGRATIONS } })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error instanceof Error ? error : new Error(String(error))
}

/** Children before parents, for foreign keys. */
const DATA_TABLES = ["import_issues", "contact_notes", "students", "imports"] as const

/** Deletes every student, note and import, keeping the schema (DECISIONS P1: "Reset database"). */
export async function clearData(db: Db): Promise<void> {
  await db.transaction().execute(async (trx) => {
    for (const table of DATA_TABLES) await trx.deleteFrom(table).execute()
  })
}

const INITIALIZED = "initialized"

export async function isInitialized(db: Db): Promise<boolean> {
  const row = await db.selectFrom("app_meta").select("value").where("key", "=", INITIALIZED).executeTakeFirst()
  return row !== undefined
}

/** After this, startup leaves the data alone, so a reset database stays empty until someone imports. */
export async function markInitialized(db: Db): Promise<void> {
  await db
    .insertInto("app_meta")
    .values({ key: INITIALIZED, value: new Date().toISOString() })
    .onConflict((oc) => oc.column("key").doNothing())
    .execute()
}

/**
 * Brings the database up to date. On the very first run it also imports the sample data, so a
 * fresh clone or a new deployment opens on a working outreach queue (DECISIONS P3).
 */
export async function ensureReady(db: Db, options: { seed?: boolean } = {}): Promise<void> {
  await migrateToLatest(db)
  if (await isInitialized(db)) return
  if (options.seed ?? true) await seedSampleData(db)
  await markInitialized(db)
}
