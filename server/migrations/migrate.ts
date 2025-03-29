const fs = require("fs").promises;
const path = require("path");
const { FileMigrationProvider, Migrator } = require("kysely");
const { db } = require("../db");

interface MigrationResult {
  status: "Success" | "Error";
  migrationName: string;
}

async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it: MigrationResult) => {
    if (it.status === "Success") {
      console.log(`Migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`Failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("Failed to migrate");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

migrateToLatest(); 