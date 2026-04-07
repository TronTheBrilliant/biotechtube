/**
 * Enrich funding rounds with investor data using DeepSeek.
 * Targets recent rounds $10M+ that have "Undisclosed" as lead_investor.
 *
 * Usage: npx tsx scripts/enrich-funding-investors.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

interface Round {
  id: string;
  company_name: string;
  round_type: string;
  amount_usd: number;
  announced_date: string;
  country: string | null;
  sector: string | null;
}

async function enrichRound(round: Round): Promise<{
  lead_investor: string | null;
  investors: string[] | null;
  sector: string | null;
} | null> {
  const amountStr = round.amount_usd >= 1e9
    ? `$${(round.amount_usd / 1e9).toFixed(1)}B`
    : `$${(round.amount_usd / 1e6).toFixed(0)}M`;

  const prompt = `I need factual data about this biotech funding round. Search your knowledge:

Company: ${round.company_name}
Round: ${round.round_type}
Amount: ${amountStr}
Date: ${round.announced_date}
Country: ${round.country || "Unknown"}

Please identify:
1. The LEAD INVESTOR(S) for this round — the firm(s) that led the investment
2. Other participating investors if known
3. The therapeutic/technology sector (e.g., Oncology, Gene Therapy, Neuroscience, Antibodies, etc.)

IMPORTANT: Only provide investor names you are confident about. If you genuinely don't know, say "Unknown" rather than guessing.

Return ONLY a JSON object:
{
  "lead_investor": "Firm Name" or "Unknown",
  "investors": ["Firm1", "Firm2"] or null,
  "sector": "Oncology" or null
}

No markdown. Just the JSON.`;

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a biotech venture capital data analyst. Provide factual investor data only. Do not fabricate investor names." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      console.error(`  API error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    let content = data.choices[0]?.message?.content || "";
    if (content.startsWith("```")) content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();

    const parsed = JSON.parse(content);
    return {
      lead_investor: parsed.lead_investor === "Unknown" ? null : parsed.lead_investor,
      investors: parsed.investors,
      sector: parsed.sector,
    };
  } catch (err) {
    console.error(`  Error enriching ${round.company_name}:`, (err as Error).message);
    return null;
  }
}

async function main() {
  console.log("=== Funding Round Investor Enrichment ===\n");

  // Get recent rounds $10M+ with Undisclosed/null investors
  const { data: rounds } = await supabase
    .from("funding_rounds")
    .select("id, company_name, round_type, amount_usd, announced_date, country, sector")
    .gt("amount_usd", 10_000_000)
    .or("lead_investor.is.null,lead_investor.eq.Undisclosed")
    .order("announced_date", { ascending: false })
    .limit(200);

  if (!rounds || rounds.length === 0) {
    console.log("No rounds to enrich.");
    return;
  }

  console.log(`Found ${rounds.length} rounds to enrich\n`);

  let enriched = 0;
  let skipped = 0;

  for (const round of rounds) {
    const result = await enrichRound(round);

    if (!result || (!result.lead_investor && !result.investors)) {
      skipped++;
      console.log(`  ✗ ${round.company_name} — no data found`);
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    const updates: Record<string, unknown> = {};
    if (result.lead_investor) updates.lead_investor = result.lead_investor;
    if (result.investors && result.investors.length > 0) updates.investors = result.investors;
    if (result.sector && !round.sector) updates.sector = result.sector;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("funding_rounds")
        .update(updates)
        .eq("id", round.id);

      if (!error) {
        enriched++;
        const investorStr = result.lead_investor || (result.investors ? result.investors[0] : "?");
        console.log(`  ✓ ${round.company_name} — ${investorStr}${result.sector ? ` [${result.sector}]` : ""}`);
      }
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n=== Done ===`);
  console.log(`Enriched: ${enriched} | Skipped: ${skipped} | Total: ${rounds.length}`);
}

main().catch(console.error);
