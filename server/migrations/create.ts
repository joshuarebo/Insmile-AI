import { promises as fs } from "fs";
import path from "path";

async function createMigration() {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const name = process.argv[2];

  if (!name) {
    console.error("Please provide a migration name");
    process.exit(1);
  }

  const fileName = `${timestamp}_${name}.ts`;
  const filePath = path.join(__dirname, fileName);

  const template = `import { Kysely } from "kysely";

export async function up(db: Kysely<any>) {
  // Add migration code here
}

export async function down(db: Kysely<any>) {
  // Add rollback code here
}`;

  await fs.writeFile(filePath, template, "utf8");
  console.log(`Created migration file: ${fileName}`);
}

createMigration(); 