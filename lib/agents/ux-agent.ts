import { createServerClient } from "@/lib/supabase";
import { logFixes, type AgentFix } from "./framework";

export async function runUxAgent(
  runId: string,
  batchSize: number,
  _modelId: string | null
): Promise<{
  items_scanned: number;
  items_fixed: number;
  issues_found: number;
  summary: string;
  details?: Record<string, unknown>;
}> {
  const supabase = createServerClient();
  const allFixes: AgentFix[] = [];
  let issuesFound = 0;
  let resolved = 0;

  // 1. Check open error reports
  const { data: openReports } = await supabase
    .from("error_reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(batchSize);

  const reports = openReports || [];

  // 2. For each report, check if the page still has issues
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://biotechtube.com";

  for (const report of reports) {
    if (!report.page_url) continue;

    try {
      const url = report.page_url.startsWith("http")
        ? report.page_url
        : `${baseUrl}${report.page_url}`;

      const res = await fetch(url, { method: "HEAD", redirect: "follow" });

      if (res.ok) {
        // Page loads fine — auto-resolve the report
        await supabase
          .from("error_reports")
          .update({
            status: "resolved",
            resolution_note: "Auto-resolved by UX Agent: page loads successfully",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", report.id);

        resolved++;
        allFixes.push({
          entity_type: "error_report",
          entity_id: report.id,
          field: "status",
          old_value: "open",
          new_value: "resolved",
          confidence: 1.0,
        });
      } else {
        issuesFound++;
      }
    } catch {
      issuesFound++;
    }
  }

  // 3. Spot-check random company pages
  const { data: randomCompanies } = await supabase
    .from("companies")
    .select("slug")
    .limit(10);

  let pagesChecked = 0;
  let pagesFailed = 0;

  for (const company of randomCompanies || []) {
    try {
      const res = await fetch(`${baseUrl}/company/${company.slug}`, {
        method: "HEAD",
        redirect: "follow",
      });
      pagesChecked++;
      if (!res.ok) {
        pagesFailed++;
        issuesFound++;
      }
    } catch {
      pagesChecked++;
      pagesFailed++;
      issuesFound++;
    }
  }

  await logFixes(runId, allFixes);

  const parts: string[] = [];
  if (resolved > 0) parts.push(`Resolved ${resolved} error report${resolved > 1 ? "s" : ""}`);
  if (pagesFailed > 0) parts.push(`${pagesFailed} of ${pagesChecked} spot-checked pages failed`);
  if (parts.length === 0) parts.push(`All ${reports.length} reports reviewed, ${pagesChecked} pages checked — no issues`);

  return {
    items_scanned: reports.length + pagesChecked,
    items_fixed: resolved,
    issues_found: issuesFound,
    summary: parts.join(", "),
    details: {
      reports_checked: reports.length,
      reports_resolved: resolved,
      pages_spot_checked: pagesChecked,
      pages_failed: pagesFailed,
    },
  };
}
