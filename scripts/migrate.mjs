// Applies supabase/migrations/*.sql to the NEW TSC project in filename order, once each.
// Tracks applied files in supabase_migrations.schema_migrations (same table the Supabase CLI uses).
// Usage: node scripts/migrate.mjs [--dry]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const REF = "ijfjncsdkhnqpjdgjupo";
const dir = path.resolve("supabase/migrations");
const dry = process.argv.includes("--dry");

// SQL goes through a temp file: migrations can exceed the Windows command-line length limit.
const sql = (q, write = false) => {
  const tmp = path.join(os.tmpdir(), `tsc-migrate-${process.pid}.sql`);
  fs.writeFileSync(tmp, q);
  try {
    return JSON.parse(execFileSync("node", ["scripts/sql.mjs", REF, tmp, ...(write ? ["--write"] : [])], { maxBuffer: 1 << 28 }).toString() || "[]");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
};

sql(
  `create schema if not exists supabase_migrations;
   create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`,
  true,
);
const applied = new Set(sql(`select version from supabase_migrations.schema_migrations`).map((r) => r.version));

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const version = file.split("_")[0];
  if (applied.has(version)) continue;
  console.log(`${dry ? "[dry] would apply" : "applying"} ${file}`);
  if (dry) continue;
  const body = fs.readFileSync(path.join(dir, file), "utf8");
  // One request = one transaction: the migration and its bookkeeping row commit together.
  const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
  sql(`begin;\n${body}\n;insert into supabase_migrations.schema_migrations(version, name) values ('${version}', '${name}');\ncommit;`, true);
}
console.log("migrations up to date");
