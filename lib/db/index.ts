import { createDb, type Db } from "./client"
import { ensureReady } from "./setup"

const shared = globalThis as unknown as { __advisingDb?: Promise<Db> }

/**
 * The app's database, migrated and (on first run) seeded. One instance per server process; kept on
 * globalThis so dev-mode hot reloads don't open a new connection each time.
 */
export function getDb(): Promise<Db> {
  if (!shared.__advisingDb) {
    const db = createDb()
    shared.__advisingDb = ensureReady(db)
      .then(() => db)
      .catch(async (error: unknown) => {
        shared.__advisingDb = undefined
        await db.destroy()
        throw error
      })
  }
  return shared.__advisingDb
}

export type { Db } from "./client"
