import type { Kysely } from "kysely"
import type { Migration } from "kysely/migration"

/*
 * Migrations use only column types and constraints that SQLite and Postgres both accept
 * (DECISIONS T2). Add new migrations to the end of MIGRATIONS; never edit a shipped one.
 */

const initial: Migration = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable("imports")
      .addColumn("import_id", "text", (c) => c.primaryKey())
      .addColumn("kind", "text", (c) => c.notNull())
      .addColumn("source_name", "text", (c) => c.notNull())
      .addColumn("source_kind", "text", (c) => c.notNull())
      .addColumn("source_sha256", "text", (c) => c.notNull())
      .addColumn("accepted_by", "text", (c) => c.notNull())
      .addColumn("column_mapping", "text", (c) => c.notNull())
      .addColumn("rows_in_file", "integer", (c) => c.notNull())
      .addColumn("rows_added", "integer", (c) => c.notNull())
      .addColumn("rows_updated", "integer", (c) => c.notNull())
      .addColumn("rows_unchanged", "integer", (c) => c.notNull())
      .addColumn("rows_excluded", "integer", (c) => c.notNull())
      .addColumn("created_at", "text", (c) => c.notNull())
      .execute()

    await db.schema
      .createTable("students")
      .addColumn("student_id", "text", (c) => c.primaryKey())
      .addColumn("first_name", "text", (c) => c.notNull())
      .addColumn("last_name", "text", (c) => c.notNull())
      .addColumn("email", "text", (c) => c.notNull())
      .addColumn("major", "text", (c) => c.notNull())
      .addColumn("class_year", "text", (c) => c.notNull())
      .addColumn("credits_earned", "integer", (c) => c.notNull())
      .addColumn("gpa", "double precision")
      .addColumn("advisor", "text", (c) => c.notNull())
      .addColumn("risk_flag", "text", (c) => c.notNull())
      .addColumn("source_last_contact_date", "text")
      .addColumn("contact_preference", "text")
      .addColumn("possible_duplicate_of", "text")
      .addColumn("import_id", "text", (c) => c.references("imports.import_id"))
      .addColumn("created_at", "text", (c) => c.notNull())
      .addColumn("updated_at", "text", (c) => c.notNull())
      .execute()

    await db.schema
      .createTable("contact_notes")
      .addColumn("note_id", "text", (c) => c.primaryKey())
      .addColumn("student_id", "text", (c) => c.notNull().references("students.student_id"))
      .addColumn("contact_date", "text", (c) => c.notNull())
      .addColumn("contact_type", "text", (c) => c.notNull())
      .addColumn("advisor", "text", (c) => c.notNull())
      .addColumn("note_text", "text", (c) => c.notNull())
      .addColumn("follow_up_date", "text")
      .addColumn("is_sensitive", "integer", (c) => c.notNull().defaultTo(0))
      .addColumn("source", "text", (c) => c.notNull())
      .addColumn("import_id", "text", (c) => c.references("imports.import_id"))
      .addColumn("created_at", "text", (c) => c.notNull())
      .execute()
    await db.schema.createIndex("contact_notes_student_id_idx").on("contact_notes").column("student_id").execute()

    await db.schema
      .createTable("import_issues")
      .addColumn("id", "text", (c) => c.primaryKey())
      .addColumn("import_id", "text", (c) => c.notNull().references("imports.import_id"))
      .addColumn("rule", "text", (c) => c.notNull())
      .addColumn("severity", "text", (c) => c.notNull())
      .addColumn("row_number", "integer", (c) => c.notNull())
      .addColumn("record_id", "text")
      .addColumn("field", "text")
      .addColumn("message", "text", (c) => c.notNull())
      .addColumn("original_value", "text")
      .addColumn("final_value", "text")
      .addColumn("resolution", "text", (c) => c.notNull())
      .execute()
    await db.schema.createIndex("import_issues_import_id_idx").on("import_issues").column("import_id").execute()

    await db.schema
      .createTable("app_meta")
      .addColumn("key", "text", (c) => c.primaryKey())
      .addColumn("value", "text", (c) => c.notNull())
      .execute()
  },

  async down(db: Kysely<unknown>) {
    for (const table of ["app_meta", "import_issues", "contact_notes", "students", "imports"]) {
      await db.schema.dropTable(table).ifExists().execute()
    }
  },
}

export const MIGRATIONS: Record<string, Migration> = {
  "0001_initial": initial,
}
