#!/usr/bin/env npx tsx
/**
 * Generate a weekly biotech market recap article.
 *
 * Designed to run every Monday via GitHub Actions.
 * Queries the past week's market data and generates a "Biotech Market Weekly" post.
 *
 * Usage: npx tsx scripts/generate-weekly-recap.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

if (!DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY");
  process.exit(1);
}

/* ─── Helpers ─── */

function fmt(val: number | null | undefined): string {
  if (!val) return "N/A";
  const n = Number(val);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return "N/A";
  return `${Number(val) >= 0 ? "+" : ""}${Number(val).toFixed(1)}%`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function getWeekRange(): { start: string; end: string; label: string } {
  const now = new Date();
  // Go back to last Monday (or this Monday if today is Monday)
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() - (daysToMonday > 0 ? daysToMonday - 4 : -1)); // Last Friday

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 4); // Monday of that week

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];

  const startMonth = monthNames[startDate.getMonth()];
  const label = `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;

  return { start, end, label };
}

/* ─── DeepSeek ─── */

async function callDeepSeek(prompt: string): Promise<string> {
  const res = await fetch(DEEPSEEK_URL, {
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
          content: `You are a senior biotech market analyst writing the weekly market recap for BiotechTube, a professional biotech intelligence platform at biotechtube.io. You write like a financial journalist at STAT News or Endpoints News.

Rules:
- Write 2,000-3,000 words
- Use markdown with ## headings (never #)
- Include markdown data tables for gainers/losers/funding
- Reference companies with internal links: [Company Name](/company/company-slug)
- Start with Key Takeaways (blockquote)
- Professional tone, analytical, data-driven
- Use ONLY the provided data, never invent numbers
- End with: "---\\n\\n*Data and analysis provided by [BiotechTube](https://biotechtube.io). Updated ${today()}.*"`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 6000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return json.choices[0].message.content;
}

/* ─── Auto-link company names ─── */

function addInternalLinks(
  content: string,
  companies: { name: string; slug: string }[]
): string {
  const sorted = [...companies].sort((a, b) => b.name.length - a.name.length);
  let result = content;

  for (const co of sorted) {
    if (!co.name || !co.slug || co.name.length < 4) continue;
    const escaped = co.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<!\\[)\\b${escaped}\\b(?!\\]\\()(?![^\\[]*\\])`,
      "g"
    );
    let replaced = false;
    result = result.replace(regex, (match) => {
      if (replaced) return match;
      replaced = true;
      return `[${match}](/company/${co.slug})`;
    });
  }

  return result;
}

/* ─── Main ─── */

async function main() {
  const week = getWeekRange();
  console.log(`=== Weekly Recap Generator ===`);
  console.log(`Week: ${week.label} (${week.start} to ${week.end})\n`);

  const slug = `biotech-market-weekly-${week.start}`;
  const title = `Biotech Market Weekly: ${week.label}`;

  // Check if already exists
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("slug", slug)
    .single();

  if (existing) {
    console.log(`Article already exists: ${slug}`);
    console.log("Skipping generation.");
    return;
  }

  // Fetch data
  console.log("Querying database...");

  const [
    snapshotResult,
    recentSnapshots,
    gainersResult,
    losersResult,
    fundingResult,
  ] = await Promise.all([
    supabase
      .from("market_snapshots")
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("market_snapshots")
      .select("*")
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("company_price_history")
      .select("ticker, change_pct, market_cap_usd, date")
      .gte("date", week.start)
      .not("change_pct", "is", null)
      .order("change_pct", { ascending: false })
      .limit(10),
    supabase
      .from("company_price_history")
      .select("ticker, change_pct, market_cap_usd, date")
      .gte("date", week.start)
      .not("change_pct", "is", null)
      .order("change_pct", { ascending: true })
      .limit(10),
    supabase
      .from("funding_rounds")
      .select("company_name, round_type, amount_usd, country, sector, lead_investor, announced_date")
      .gte("announced_date", daysAgo(14))
      .not("amount_usd", "is", null)
      .order("amount_usd", { ascending: false })
      .limit(15),
  ]);

  const snapshot = snapshotResult.data;
  const snapshots = recentSnapshots.data || [];
  const gainers = gainersResult.data || [];
  const losers = losersResult.data || [];
  const funding = fundingResult.data || [];

  // Load company names
  const allCompanies: { name: string; slug: string }[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("name, slug")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allCompanies.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log(`  Snapshot: ${snapshot ? snapshot.date : "none"}`);
  console.log(`  Gainers: ${gainers.length}, Losers: ${losers.length}`);
  console.log(`  Funding rounds: ${funding.length}`);
  console.log(`  Companies for linking: ${allCompanies.length}`);

  // Build prompt
  const prompt = `Write a comprehensive weekly biotech market recap article titled "${title}".

REAL DATA from our database:

Latest market snapshot:
${snapshot ? `- Date: ${snapshot.date}\n- Total market cap: ${fmt(snapshot.total_market_cap)}\n- Public companies tracked: ${snapshot.public_company_count}\n- 1-day change: ${fmtPct(snapshot.change_1d_pct)}\n- 7-day change: ${fmtPct(snapshot.change_7d_pct)}\n- 30-day change: ${fmtPct(snapshot.change_30d_pct)}\n- YTD change: ${fmtPct(snapshot.change_ytd_pct)}` : "No snapshot data available"}

Market trend (last 10 days):
| Date | Total Market Cap | Daily Change |
|------|-----------------|--------------|
${snapshots.map((s: any) => `| ${s.date} | ${fmt(s.total_market_cap)} | ${fmtPct(s.change_1d_pct)} |`).join("\n")}

Top gainers this week:
| Ticker | Change | Market Cap |
|--------|--------|------------|
${gainers.map((g: any) => `| ${g.ticker} | ${fmtPct(g.change_pct)} | ${fmt(g.market_cap_usd)} |`).join("\n")}

Top losers this week:
| Ticker | Change | Market Cap |
|--------|--------|------------|
${losers.map((l: any) => `| ${l.ticker} | ${fmtPct(l.change_pct)} | ${fmt(l.market_cap_usd)} |`).join("\n")}

Notable funding rounds:
| Company | Round | Amount | Country | Sector | Lead Investor |
|---------|-------|--------|---------|--------|---------------|
${funding.map((r: any) => `| ${r.company_name} | ${r.round_type || "N/A"} | ${fmt(r.amount_usd)} | ${r.country || "N/A"} | ${r.sector || "N/A"} | ${r.lead_investor || "N/A"} |`).join("\n")}

Structure:
1. Key Takeaways (3-5 bullet points in blockquote)
2. Market Overview — where the global biotech index finished
3. Top Gainers & Losers table with analysis of what drove moves
4. Notable Funding Rounds table
5. Sector Performance — which areas outperformed/underperformed
6. Regulatory & Pipeline News — any FDA decisions, clinical data readouts
7. M&A Watch — any deals or rumors
8. What to Watch Next Week
9. Methodology

Target keywords: "biotech market weekly", "biotech stocks this week ${week.label}", "biotech market recap"`;

  console.log("\nCalling DeepSeek API...");
  let content = await callDeepSeek(prompt);

  // Auto-link
  console.log("Auto-linking company names...");
  content = addInternalLinks(content, allCompanies);

  const linkCount = (content.match(/\[([^\]]+)\]\(\/company\//g) || []).length;
  const wordCount = content.split(/\s+/).length;
  console.log(`  ${linkCount} internal links, ${wordCount} words`);

  // Extract excerpt
  const firstPara = content
    .split("\n\n")
    .find((p) => p.trim() && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("-") && !p.startsWith(">"));
  const excerpt = firstPara
    ? firstPara.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").slice(0, 300)
    : `Weekly biotech market recap for ${week.label}. Market data, top gainers and losers, funding rounds, and analysis.`;

  // Insert
  console.log("\nInserting into blog_posts...");
  const { error } = await supabase.from("blog_posts").insert({
    slug,
    title,
    content,
    excerpt,
    category: "weekly-recap",
    tags: ["weekly-recap", "market-analysis", "biotech-stocks", new Date().getFullYear().toString()],
    author: "BiotechTube Research",
    meta_title: title,
    meta_description: excerpt.slice(0, 155) + "...",
    status: "published",
  });

  if (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }

  console.log(`\nSUCCESS: Published "${title}"`);
  console.log(`URL: https://biotechtube.io/blog/${slug}`);
}

main().catch(console.error);
