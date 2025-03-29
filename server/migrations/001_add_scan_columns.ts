import { Kysely } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable("scans")
    .addColumn("file_url", "text", (col) => col.notNull())
    .addColumn("file_type", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable("scans")
    .dropColumn("file_url")
    .dropColumn("file_type")
    .dropColumn("status")
    .execute();
} 