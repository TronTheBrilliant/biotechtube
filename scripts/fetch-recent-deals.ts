#!/usr/bin/env npx tsx
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Deal {
  company: string;
  round_type: string;
  amount_millions: number;
  date: string;
  lead_investor: string;
  country: string;
}

async function fetchDeals(year: number): Promise<Deal[]> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a biotech/pharma funding data analyst. Return accurate data only as JSON.",
        },
        {
          role: "user",
          content: `List the 80 largest biotech and pharmaceutical funding rounds in ${year}. Include IPOs, Series A/B/C/D/E rounds, PIPE deals, public offerings, and major acquisitions.

Return ONLY a JSON array of objects:
- "company": company name
- "round_type": "IPO", "Series A", "Series B", "Series C", "Series D", "Series E", "PIPE", "Public Offering", "Follow-on Offering", "Private Equity", "Acquisition", "Debt", "Grant", "Seed"
- "amount_millions": number in USD millions
- "date": "YYYY-MM-DD" or "YYYY-MM"
- "lead_investor": investor or underwriter name, or "Undisclosed"
- "country": country where company is headquartered

Only include deals you are confident about. Focus on biotech, biopharma, genomics, cell therapy, gene therapy, diagnostics, and medtech companies.`,
        },
      ],
      temperature: 0,
      max_tokens: 8000,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error(`No JSON found for ${year}`);
    return [];
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error(`JSON parse error for ${year}`);
    return [];
  }
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  if (/^\d{4}$/.test(dateStr)) return `${dateStr}-06-15`;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-15`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

async function main() {
  console.log("\n📡 Fetching major biotech deals for 2024 and 2025\n");

  // Get existing 2024+ to deduplicate
  const { data: existing } = await supabase
    .from("funding_rounds")
    .select("company_name, round_type, announced_date")
    .gte("announced_date", "2024-01-01");

  const existingKeys = new Set(
    (existing || []).map((r) =>
      `${(r.company_name || "").toLowerCase()}|${r.round_type}|${r.announced_date}`
    )
  );
  console.log(`Existing 2024+ rounds: ${existingKeys.size}`);

  // Get company name -> id mapping
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .limit(20000);

  const nameToId = new Map<string, string>();
  for (const c of companies || []) {
    nameToId.set(c.name.toLowerCase(), c.id);
  }

  let totalInserted = 0;

  for (const year of [2024, 2025]) {
    console.log(`\nFetching ${year} deals...`);
    const deals = await fetchDeals(year);
    console.log(`  Got ${deals.length} deals`);

    const rows: Array<Record<string, unknown>> = [];

    for (const deal of deals) {
      if (!deal.company || !deal.amount_millions || deal.amount_millions <= 0) continue;
      const normalized = normalizeDate(deal.date);
      if (!normalized) continue;

      const key = `${deal.company.toLowerCase()}|${deal.round_type}|${normalized}`;
      if (existingKeys.has(key)) {
        continue;
      }

      // Try to find company in DB
      const companyId = nameToId.get(deal.company.toLowerCase());

      rows.push({
        company_id: companyId || null,
        company_name: deal.company,
        round_type: deal.round_type,
        amount: Math.round(deal.amount_millions * 1_000_000),
        currency: "USD",
        amount_usd: Math.round(deal.amount_millions * 1_000_000),
        lead_investor: deal.lead_investor || "Undisclosed",
        announced_date: normalized,
        country: deal.country || "United States",
        confidence: "ai_enriched",
      });

      existingKeys.add(key);
    }

    if (rows.length > 0) {
      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("funding_rounds").insert(batch);
        if (error) {
          console.error(`  Insert error: ${error.message}`);
        } else {
          totalInserted += batch.length;
          console.log(`  Inserted ${batch.length} rounds (${totalInserted} total)`);
        }
      }
    } else {
      console.log("  No new rounds to insert");
    }
  }

  console.log(`\n✅ Done! Inserted ${totalInserted} new rounds for 2024-2025`);

  // Final check
  const { data: finalCounts } = await supabase
    .rpc("get_funding_annual" as never);
  const recent = (finalCounts as { year: number; rounds: number; total: number }[] || [])
    .filter((r: { year: number }) => r.year >= 2023);
  console.log("\nRecent years:");
  for (const r of recent) {
    console.log(`  ${r.year}: ${r.rounds} rounds, $${(Number(r.total) / 1e9).toFixed(1)}B`);
  }
}

main().catch(console.error);
