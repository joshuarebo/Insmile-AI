/** @param {import('kysely').Kysely<any>} db */
exports.up = async (db) => {
  await db.schema
    .alterTable("scans")
    .addColumn("file_url", "text", (col) => col.notNull())
    .addColumn("file_type", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
    .execute();
};

/** @param {import('kysely').Kysely<any>} db */
exports.down = async (db) => {
  await db.schema
    .alterTable("scans")
    .dropColumn("file_url")
    .dropColumn("file_type")
    .dropColumn("status")
    .execute();
}; 