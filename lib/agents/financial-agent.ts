import { createServerClient } from "@/lib/supabase";
import { callAI, logFixes, type AgentFix } from "./framework";

export async function runFinancialAgent(
  runId: string,
  batchSize: number,
  modelId: string | null
): Promise<{
  items_scanned: number;
  items_fixed: number;
  issues_found: number;
  summary: string;
  details?: Record<string, unknown>;
  model_used?: string;
}> {
  const supabase = createServerClient();
  const allFixes: AgentFix[] = [];
  let issuesFound = 0;
  let priceUpdateTriggered = false;

  // 1. Check price staleness
  const { data: latestPrice } = await supabase
    .from("company_price_history")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  const latestDate = latestPrice?.[0]?.date || null;
  const daysOld = latestDate
    ? Math.floor((Date.now() - new Date(latestDate).getTime()) / 86400000)
    : 999;

  if (daysOld > 1) {
    issuesFound++;
    // Trigger price update
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://biotechtube.com";
    try {
      await fetch(`${baseUrl}/api/cron/update-prices`, { method: "POST" });
      priceUpdateTriggered = true;
    } catch {
      // Price update trigger failed — log but continue
    }
  }

  // 2. Check for market cap anomalies
  const { data: anomalies } = await supabase
    .from("company_price_history")
    .select("company_id, date, market_cap_usd, change_pct")
    .gt("change_pct", 50)
    .order("date", { ascending: false })
    .limit(20);

  const negAnomalies = await supabase
    .from("company_price_history")
    .select("company_id, date, market_cap_usd, change_pct")
    .lt("change_pct", -50)
    .order("date", { ascending: false })
    .limit(20);

  const allAnomalies = [
    ...(anomalies || []),
    ...(negAnomalies.data || []),
  ];

  if (allAnomalies.length > 0) {
    issuesFound += allAnomalies.length;

    // Get company names for context
    const anomalyIds = Array.from(new Set(allAnomalies.map((a: any) => a.company_id)));
    const { data: anomalyCompanies } = await supabase
      .from("companies")
      .select("id, name, ticker")
      .in("id", anomalyIds);

    const nameMap = new Map((anomalyCompanies || []).map((c: any) => [c.id, c]));

    for (const anomaly of allAnomalies) {
      const company = nameMap.get(anomaly.company_id);
      allFixes.push({
        entity_type: "company_price",
        entity_id: anomaly.company_id,
        field: "change_pct",
        old_value: String(anomaly.change_pct),
        new_value: null, // Flagged, not corrected
        confidence: null,
      });
    }
  }

  await logFixes(runId, allFixes);

  const parts: string[] = [];
  if (priceUpdateTriggered) parts.push("Price update triggered");
  if (daysOld <= 1) parts.push("Prices are fresh");
  if (allAnomalies.length > 0) parts.push(`${allAnomalies.length} anomalies flagged`);
  if (parts.length === 0) parts.push("All financial data looks healthy");

  return {
    items_scanned: 1, // One check cycle
    items_fixed: priceUpdateTriggered ? 1 : 0,
    issues_found: issuesFound,
    summary: parts.join(", "),
    details: {
      price_days_old: daysOld,
      price_update_triggered: priceUpdateTriggered,
      anomalies_found: allAnomalies.length,
    },
  };
}
