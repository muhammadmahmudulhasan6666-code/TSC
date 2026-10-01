// Brings every remaining old table over (code.md §9.5) so nothing is lost:
//  * notifications + admin_audit_log → their public tables (same shape; users see their history).
//  * everything else → schema `legacy`, an exact copy that the REST API never exposes. Each module
//    migration (MathSprint, MyNotes, bookings…) later moves its rows from legacy.* into the new design.
// `--ddl` writes supabase/migrations/…_legacy_schema.sql (structure only, committed);
// default run imports the rows (data never touches git).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REF = "ijfjncsdkhnqpjdgjupo";
const DUMP = "C:/TSC Local/data-backup/2026-10-01/db";
const load = (f) => JSON.parse(fs.readFileSync(path.join(DUMP, f), "utf8"));

const ALREADY = new Set(["user_profiles", "user_roles", "student_profiles", "teacher_profiles", "user_connects"]);
const TO_PUBLIC = new Set(["notifications", "admin_audit_log"]);

const counts = load("_row_counts.json");
const columns = load("_columns.json").filter((c) => c.table_schema === "public");
const constraints = load("_constraints.json");
const tables = Object.keys(counts).filter((t) => !ALREADY.has(t) && !TO_PUBLIC.has(t)).sort();

const pgType = (c) => {
  const map = { _text: "text[]", _uuid: "uuid[]", _int4: "int[]", int2: "smallint", int4: "int", int8: "bigint", varchar: "text", bool: "boolean" };
  if (map[c.udt_name]) return map[c.udt_name];
  if (["text", "timestamptz", "uuid", "jsonb", "numeric", "date", "time"].includes(c.udt_name)) return c.udt_name;
  return "text"; // old enums become text in the archive
};

function ddl() {
  const parts = [
    "-- Exact archive of the old (Lovable) tables not yet re-modelled. Never exposed through the API;",
    "-- module migrations move rows from here into the new public tables.",
    "create schema if not exists legacy;",
    "revoke all on schema legacy from public, anon, authenticated;",
  ];
  for (const t of tables) {
    const cols = columns.filter((c) => c.table_name === t).sort((a, b) => a.ordinal_position - b.ordinal_position);
    const pk = constraints.find((k) => k.tbl === `${t}` || k.tbl === `public.${t}` ? /^PRIMARY KEY/.test(k.def) && (k.tbl === t || k.tbl === `public.${t}`) : false);
    const body = cols.map((c) => `  "${c.column_name}" ${pgType(c)}`);
    if (pk) body.push(`  ${pk.def}`);
    parts.push(`create table legacy."${t}" (\n${body.join(",\n")}\n);`);
  }
  return parts.join("\n") + "\n";
}

if (process.argv.includes("--ddl")) {
  const file = "supabase/migrations/20261001000600_legacy_schema.sql";
  fs.writeFileSync(file, ddl());
  console.log(`wrote ${file} (${tables.length} tables)`);
  process.exit(0);
}

// ── Data ─────────────────────────────────────────────────────────────────────────────────
const run = (sql) => {
  const tmp = path.join(os.tmpdir(), "tsc-legacy.sql");
  fs.writeFileSync(tmp, sql);
  try {
    return JSON.parse(execFileSync("node", ["scripts/sql.mjs", REF, tmp, "--write"], { maxBuffer: 1 << 28 }).toString() || "[]");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
};
const insert = (target, rows, cols) =>
  `insert into ${target} (${cols.map((c) => `"${c}"`).join(",")}) select ${cols.map((c) => `"${c}"`).join(",")} from jsonb_populate_recordset(null::${target}, $json$${JSON.stringify(rows)}$json$::jsonb) on conflict do nothing;`;

const report = {};
for (const t of [...TO_PUBLIC, ...tables]) {
  const rows = load(`public/${t}.json`);
  if (!rows.length) continue;
  const target = TO_PUBLIC.has(t) ? `public.${t}` : `legacy."${t}"`;
  let cols = Object.keys(rows[0]);
  if (t === "notifications") cols = ["id", "user_id", "type", "title", "message", "metadata", "is_read", "created_at"];
  if (t === "admin_audit_log") cols = ["id", "admin_user_id", "action_type", "target_table", "target_id", "action_details", "ip_address", "created_at"];
  // Chunk to keep each request a few MB.
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400).map((r) => {
      const o = Object.fromEntries(cols.map((c) => [c, r[c] ?? null]));
      if (t === "notifications") o.metadata ??= {};
      if (t === "admin_audit_log") o.action_details ??= {};
      return o;
    });
    run(`begin;\n${insert(target, chunk, cols)}\ncommit;`);
  }
  report[t] = rows.length;
}
const check = run(`select (select count(*) from public.notifications) notifications, (select count(*) from public.admin_audit_log) audit,
  (select sum(n) from (select (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from legacy.%I', table_name), false, true, '')))[1]::text::int n
   from information_schema.tables where table_schema = 'legacy') s) legacy_rows`);
console.log("source rows:", Object.values(report).reduce((a, b) => a + b, 0), "→ db:", check[0]);
