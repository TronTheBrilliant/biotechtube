import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { readFileSync } from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

async function main() {
  console.log("Running pivot schema against Supabase...");
  console.log(`Project: ${projectRef}\n`);

  const schemaPath = resolve(__dirname, "pivot-schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");

  // Split into individual statements
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  const pgUrl = `https://${projectRef}.supabase.co/pg/query`;

  // Try full SQL first
  const response = await fetch(pgUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (response.ok) {
    console.log("✅ Pivot schema applied successfully!");
    return;
  }

  console.log("Full SQL failed, trying individual statements...\n");

  let success = 0;
  let failed = 0;

  for (const stmt of statements) {
    const r = await fetch(pgUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: stmt + ";" }),
    });
    const shortStmt = stmt.replace(/\n/g, " ").slice(0, 70);
    if (r.ok) {
      console.log(`  ✅ ${shortStmt}...`);
      success++;
    } else {
      const err = await r.text();
      if (err.includes("already exists")) {
        console.log(`  ⏭️  ${shortStmt}... (already exists)`);
        success++;
      } else {
        console.log(`  ❌ ${shortStmt}... → ${err.slice(0, 120)}`);
        failed++;
      }
    }
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
