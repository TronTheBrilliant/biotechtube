import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300; // 5 min max on Pro
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Weekly DeepSeek enrichment for recent funding rounds.
 * Targets top 50 companies by valuation that have no funding rounds in the last 90 days.
 * Limited to 50 companies per run to stay within Vercel Pro 300s timeout.
 */
export async function GET() {
  const supabase = getSupabase();
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) return NextResponse.json({ ok: false, error: "No DEEPSEEK_API_KEY" });

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().split("T")[0];

  // Find companies that might have recent funding but we're missing
  // Focus on public companies and large private companies
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, ticker, country")
    .not("ticker", "is", null)
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(100);

  if (!companies || companies.length === 0) {
    return NextResponse.json({ ok: true, message: "No companies to process" });
  }

  // Filter to those without recent funding
  const companiesToCheck: typeof companies = [];
  for (const c of companies.slice(0, 60)) {
    const { count } = await supabase
      .from("funding_rounds")
      .select("id", { count: "exact", head: true })
      .eq("company_id", c.id)
      .gte("announced_date", cutoff);
    if ((count || 0) === 0) companiesToCheck.push(c);
    if (companiesToCheck.length >= 20) break; // Max 20 per run
  }

  if (companiesToCheck.length === 0) {
    return NextResponse.json({ ok: true, message: "All top companies have recent funding data" });
  }

  // Batch query DeepSeek
  const BATCH = 5;
  let totalInserted = 0;
  let totalProcessed = 0;

  for (let i = 0; i < companiesToCheck.length; i += BATCH) {
    const batch = companiesToCheck.slice(i, i + BATCH);
    const companyList = batch.map((c) => `${c.name}${c.ticker ? ` (${c.ticker})` : ""}${c.country ? `, ${c.country}` : ""}`).join("\n");

    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: `Return 2024-2026 funding rounds for biotech companies as JSON: {"Company Name": [{"round_type":"Series A","amount_millions":50,"currency":"USD","date":"2025-03-15","lead_investor":"Investor Name"}]}. Empty array if no known rounds. Only confident data.` },
            { role: "user", content: `2024-2026 funding rounds:\n\n${companyList}` }
          ],
          temperature: 0, max_tokens: 3000,
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const content = data.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const results = JSON.parse(jsonMatch[0]);

      for (const company of batch) {
        totalProcessed++;
        const rounds = results[company.name] || [];
        if (!Array.isArray(rounds) || rounds.length === 0) continue;

        for (const round of rounds) {
          if (!round.round_type || !round.date) continue;

          let dateStr = round.date;
          if (/^\d{4}$/.test(dateStr)) dateStr += "-06-15";
          if (/^\d{4}-\d{2}$/.test(dateStr)) dateStr += "-15";

          const amountUsd = round.amount_millions ? round.amount_millions * 1_000_000 : null;

          // Dedup check
          const dateObj = new Date(dateStr);
          const dateMin = new Date(dateObj); dateMin.setDate(dateMin.getDate() - 30);
          const dateMax = new Date(dateObj); dateMax.setDate(dateMax.getDate() + 30);
          const { data: existing } = await supabase.from("funding_rounds").select("id")
            .eq("company_id", company.id).eq("round_type", round.round_type)
            .gte("announced_date", dateMin.toISOString().split("T")[0])
            .lte("announced_date", dateMax.toISOString().split("T")[0]).limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("funding_rounds").insert({
            company_id: company.id,
            company_name: company.name,
            round_type: round.round_type,
            amount_usd: amountUsd,
            announced_date: dateStr,
            lead_investor: round.lead_investor || "Undisclosed",
            source_name: "deepseek",
            confidence: "estimated",
          });

          if (!error) totalInserted++;
        }
      }
    } catch { continue; }

    // Rate limit between batches
    if (i + BATCH < companiesToCheck.length) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  return NextResponse.json({
    ok: true,
    processed: totalProcessed,
    inserted: totalInserted,
    companiesChecked: companiesToCheck.length,
  });
}
