// biotechtube/scripts/generate-equity-report.ts
// Manual QA: generate one equity report end-to-end for a given company slug.
// Usage: tsx scripts/generate-equity-report.ts <slug>
// Loads .env.local automatically via dotenv.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateEquityReport } from "../lib/reports/generate";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: tsx scripts/generate-equity-report.ts <slug>");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (error || !company) {
    console.error(`Company "${slug}" not found:`, error?.message);
    process.exit(1);
  }

  console.log(`Generating equity report for ${company.name} (${company.id})...`);
  const start = Date.now();
  try {
    const result = await generateEquityReport({ companyId: company.id, angle: "general" });
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`✓ Generated in ${elapsed}s. Report ID: ${result.reportId}`);
    console.log(`  Cost: ~${(result.costCents / 100).toFixed(2)}¢`);
    console.log(`  PDF path: equity-reports/${result.reportId}/report.pdf`);
    console.log(`  Get a signed URL via Supabase dashboard or:`);
    console.log(`    supabase.storage.from("equity-reports").createSignedUrl("${result.reportId}/report.pdf", 300)`);
  } catch (e) {
    console.error("✗ Generation failed:", e);
    process.exit(1);
  }
}

main();
