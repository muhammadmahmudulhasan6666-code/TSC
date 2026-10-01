// Run SQL against a Supabase project via the Management API.
// Usage: node scripts/sql.mjs <project-ref> <sql-file | -e "sql"> [--write] [--out file.json]
// Read-only by default; pass --write only for the NEW TSC project, never for the old one.
import fs from "node:fs";

const OLD_REF = "pipxumfqykczzwcvfgua"; // old Lovable production DB — read-only, always
export const NEW_REF = "ijfjncsdkhnqpjdgjupo"; // new TSC project (Singapore)
const FORBIDDEN = ["clodwqcuejlwrksahjjy", "vzgnibkwetbsydykpsbf"]; // MMH / BoostEdly — never touch

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const args = process.argv.slice(2);
const ref = args[0];
const write = args.includes("--write");
const outIdx = args.indexOf("--out");
const sql = args[1] === "-e" ? args[2] : fs.readFileSync(args[1], "utf8");

if (FORBIDDEN.includes(ref)) throw new Error("This project is off-limits for TSC work.");
if (write && ref === OLD_REF) throw new Error("The old production DB is read-only.");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  // Old DB is reachable only with the rescue token; the new TSC project has its own token.
  headers: { Authorization: `Bearer ${ref === OLD_REF ? env.SUPABASE_ACCESS_TOKEN : env.TSC_SUPABASE_TOKEN}`, "content-type": "application/json" },
  body: JSON.stringify({ query: sql, read_only: !write }),
});
const text = await res.text();
if (!res.ok) { console.error(res.status, text); process.exit(1); }
if (outIdx > -1) { fs.writeFileSync(args[outIdx + 1], text); console.log(`wrote ${args[outIdx + 1]}`); }
else console.log(text);
