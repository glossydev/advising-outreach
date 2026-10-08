import { mkdirSync } from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { Kysely, PostgresDialect, SqliteDialect } from "kysely"
import pg from "pg"
import type { DatabaseSchema } from "./types"

export type Db = Kysely<DatabaseSchema>

export type DbConfig = { dialect: "sqlite"; file: string } | { dialect: "postgres"; url: string }

/** Where the database lives when DATABASE_URL is unset: a fresh clone needs no setup (DECISIONS T2). */
export const DEFAULT_SQLITE_FILE = "data/app.db"

/**
 * DATABASE_URL picks the database:
 * - unset → SQLite at data/app.db
 * - postgres:// or postgresql:// → Postgres (GDS)
 * - file:<path> or :memory: → SQLite at that path (tests use :memory:)
 */
export function resolveDbConfig(url: string | undefined = process.env.DATABASE_URL): DbConfig {
  const value = url?.trim()
  if (!value) return { dialect: "sqlite", file: path.resolve(process.cwd(), DEFAULT_SQLITE_FILE) }
  if (/^postgres(ql)?:\/\//i.test(value)) return { dialect: "postgres", url: value }
  if (value === ":memory:" || value === "file::memory:") return { dialect: "sqlite", file: ":memory:" }
  if (value.startsWith("file:")) return { dialect: "sqlite", file: path.resolve(process.cwd(), value.slice(5)) }
  // Only the scheme is echoed back: the rest of a connection string may hold a password.
  throw new Error(
    `DATABASE_URL must be a postgres:// URL or a file: path for SQLite (got a "${value.split(":")[0]}:" value).`,
  )
}

/** Human-readable, credential-free description, e.g. for logs and the health endpoint. */
export function describeDb(config: DbConfig): string {
  if (config.dialect === "postgres") return `Postgres (${new URL(config.url).hostname})`
  return config.file === ":memory:" ? "SQLite (in memory)" : `SQLite (${path.relative(process.cwd(), config.file)})`
}

export function createDb(config: DbConfig = resolveDbConfig()): Db {
  if (config.dialect === "postgres") {
    const pool = new pg.Pool({ connectionString: config.url, max: 5 })
    return new Kysely<DatabaseSchema>({ dialect: new PostgresDialect({ pool }) })
  }
  if (config.file !== ":memory:") mkdirSync(path.dirname(config.file), { recursive: true })
  const sqlite = new Database(config.file)
  sqlite.pragma("foreign_keys = ON")
  if (config.file !== ":memory:") sqlite.pragma("journal_mode = WAL")
  return new Kysely<DatabaseSchema>({ dialect: new SqliteDialect({ database: sqlite }) })
}
