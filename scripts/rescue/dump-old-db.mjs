// Full read-only dump of the old Lovable production DB (code.md §9.2) via the Management API.
// Writes to C:\TSC Local\data-backup\<date>\db\ — schema metadata, auth, every public table.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const REF = "pipxumfqykczzwcvfgua";
const date = new Date().toISOString().slice(0, 10);
const out = `C:/TSC Local/data-backup/${date}/db`;
fs.mkdirSync(`${out}/public`, { recursive: true });

const q = (sql) => JSON.parse(execFileSync("node", ["scripts/sql.mjs", REF, "-e", sql], { maxBuffer: 1 << 30 }).toString());
const save = (name, data) => fs.writeFileSync(`${out}/${name}.json`, JSON.stringify(data));

const meta = {
  columns: `select table_schema, table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema in ('public','storage') order by 1,2,4`,
  tables: `select c.relname, c.relkind, c.reltuples::bigint est_rows, obj_description(c.oid) comment from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','m','p') order by 1`,
  constraints: `select conrelid::regclass::text tbl, conname, pg_get_constraintdef(oid) def from pg_constraint where connamespace='public'::regnamespace order by 1,2`,
  indexes: `select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by 1,2`,
  functions: `select p.proname, pg_get_function_identity_arguments(p.oid) args, pg_get_functiondef(p.oid) def from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p') order by 1`,
  triggers: `select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement from information_schema.triggers where trigger_schema in ('public','auth','storage') order by 2,3`,
  policies: `select * from pg_policies where schemaname in ('public','storage') order by tablename, policyname`,
  views: `select table_name, view_definition from information_schema.views where table_schema='public'`,
  enums: `select t.typname, array_agg(e.enumlabel order by e.enumsortorder) labels from pg_type t join pg_enum e on e.enumtypid=t.oid group by 1 order by 1`,
  grants: `select grantee, table_name, privilege_type, null::text column_name from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') union all select grantee, table_name, privilege_type, column_name from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated') order by 2,1,3,4`,
  sequences: `select sequencename, last_value from pg_sequences where schemaname='public'`,
  extensions: `select extname, extversion from pg_extension`,
  buckets: `select * from storage.buckets`,
  storage_objects: `select id, bucket_id, name, owner, metadata, created_at, updated_at from storage.objects order by bucket_id, name`,
  migrations: `select version, name from supabase_migrations.schema_migrations order by version`,
};
for (const [k, sql] of Object.entries(meta)) {
  try { save(`_${k}`, q(sql)); console.log("ok", k); } catch (e) { console.log("FAIL", k, String(e.message).slice(0, 200)); }
}
for (const [k, sql] of Object.entries({
  cron_jobs: `select * from cron.job`,
  lovable_migrations: `select * from public._lovable_migrations`,
})) { try { save(`_${k}`, q(sql)); console.log("ok", k); } catch { console.log("skip", k); } }

// Auth — most sensitive: password hashes. Never leaves this PC.
save("auth_users", q(`select * from auth.users order by created_at`));
save("auth_identities", q(`select * from auth.identities order by created_at`));
console.log("ok auth");

// Every public base table, complete (bypasses RLS gaps of the admin-session export).
const tables = q(`select c.relname from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','p') order by 1`).map((r) => r.relname);
const counts = {};
for (const t of tables) {
  const rows = [];
  for (let off = 0; ; off += 5000) {
    const page = q(`select to_jsonb(x) j from (select * from public."${t}" order by 1 limit 5000 offset ${off}) x`).map((r) => r.j);
    rows.push(...page);
    if (page.length < 5000) break;
  }
  fs.writeFileSync(`${out}/public/${t}.json`, JSON.stringify(rows));
  counts[t] = rows.length;
}
save("_row_counts", counts);
console.log(`dumped ${tables.length} tables`, counts);
