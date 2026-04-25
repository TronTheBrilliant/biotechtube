// biotechtube/lib/reports/events.ts
// Detect material events for active living-tier reports + insert into equity_report_events.

import { createServerClient } from "@/lib/supabase";

export interface DetectorWindow {
  /** Look back this many hours for new events. Cron runs every 6h, look back 6.5h to be safe. */
  lookbackHours: number;
}

export async function detectEventsForCompany(
  companyId: string,
  reportId: string,
  window: DetectorWindow = { lookbackHours: 6.5 },
): Promise<{ inserted: number }> {
  const supabase = createServerClient();
  const since = new Date(Date.now() - window.lookbackHours * 60 * 60 * 1000).toISOString();

  const inserts: any[] = [];

  // News articles published in window mentioning the company
  const { data: company } = await supabase.from("companies").select("name, slug").eq("id", companyId).single();
  if (company) {
    // Escape special chars used by PostgREST .or() and ilike (% _ ,)
    const safe = company.name.replace(/[%_,]/g, m => "\\" + m);
    const safeSlug = (company.slug ?? "").replace(/[%_,]/g, m => "\\" + m);
    const { data: arts } = await supabase
      .from("articles")
      .select("id, headline, slug, published_at")
      .gte("published_at", since)
      .or(`headline.ilike.%${safe}%,body.ilike.%${safe}%,body.ilike.%${safeSlug}%`)
      .limit(20);
    for (const a of arts ?? []) {
      const sourceUrl = `/news/${a.slug}`;
      const { data: existing } = await supabase
        .from("equity_report_events")
        .select("id")
        .eq("equity_report_id", reportId)
        .eq("event_type", "news")
        .eq("source_url", sourceUrl)
        .limit(1);
      if (existing && existing.length > 0) continue;
      inserts.push({
        equity_report_id: reportId,
        event_type: "news",
        event_summary: a.headline,
        source_url: sourceUrl,
        is_material: true,
      });
    }
  }

  // Funding rounds added in window
  const { data: rounds } = await supabase
    .from("funding_rounds")
    .select("id, amount, round_type, announced_date")
    .eq("company_id", companyId)
    .gte("announced_date", since)
    .limit(5);
  for (const r of rounds ?? []) {
    const sourceUrl = `funding_round:${r.id}`;
    const { data: existing } = await supabase
      .from("equity_report_events")
      .select("id")
      .eq("equity_report_id", reportId)
      .eq("event_type", "funding")
      .eq("source_url", sourceUrl)
      .limit(1);
    if (existing && existing.length > 0) continue;
    inserts.push({
      equity_report_id: reportId,
      event_type: "funding",
      event_summary: `${r.round_type ?? "Round"}: $${(Number(r.amount ?? 0) / 1_000_000).toFixed(1)}M`,
      source_url: sourceUrl,
      is_material: true,
    });
  }

  if (inserts.length === 0) return { inserted: 0 };
  const { error } = await supabase.from("equity_report_events").insert(inserts);
  if (error) console.error("[events] insert failed:", error);
  return { inserted: inserts.length };
}
