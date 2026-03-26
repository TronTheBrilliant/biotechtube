#!/usr/bin/env npx tsx
/**
 * Generate 10 premium, data-driven blog articles using DeepSeek API
 * with REAL data from our Supabase database.
 *
 * Each article:
 *  - Queries the DB for relevant data
 *  - Feeds real numbers into the prompt
 *  - Auto-links company names to /company/slug profiles
 *  - Targets 2,500-3,500 words for SEO authority
 *
 * Usage: npx tsx scripts/generate-premium-articles.ts
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

/* ─── DeepSeek call ─── */

async function callDeepSeek(prompt: string, maxTokens = 8000): Promise<string> {
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
          content: `You are a senior biotech market analyst writing for BiotechTube, a professional biotech intelligence platform at biotechtube.io. You write like a financial journalist at STAT News or Endpoints News.

Rules:
- Write 2,500-3,500 words
- Use markdown format with ## headings (never # — start at ##)
- Include markdown data tables where relevant
- Reference specific companies with internal links: [Company Name](/company/company-slug)
- Be analytical and insightful, not generic
- Start with a "Key Takeaways" box (use blockquote format)
- End with a "Methodology" section explaining data sources
- Professional tone — no marketing fluff, no "exciting" or "revolutionary"
- Use ONLY the specific numbers from the data provided — never invent statistics
- End the article with: "---\\n\\n*Data and analysis provided by [BiotechTube](https://biotechtube.io). Updated ${today()}.*"`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
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
  // Sort by name length descending to avoid partial replacements
  const sorted = [...companies].sort((a, b) => b.name.length - a.name.length);
  let result = content;

  for (const co of sorted) {
    if (!co.name || !co.slug) continue;
    // Skip if name is too short (avoid false matches like "AI", "RNA")
    if (co.name.length < 4) continue;

    // Escape special regex chars in name
    const escaped = co.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Only replace occurrences NOT already inside a markdown link
    // Match the company name that is NOT preceded by [ or followed by ](
    const regex = new RegExp(
      `(?<!\\[)\\b${escaped}\\b(?!\\]\\()(?![^\\[]*\\])`,
      "g"
    );

    let replaced = false;
    result = result.replace(regex, (match) => {
      if (replaced) return match; // Only link first occurrence
      replaced = true;
      return `[${match}](/company/${co.slug})`;
    });
  }

  return result;
}

/* ─── Database queries ─── */

async function getTopCompanies(limit = 50) {
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories, founded")
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getCompaniesBySector(sectorSlug: string, limit = 30) {
  const { data: sector } = await supabase
    .from("sectors")
    .select("id, name")
    .eq("slug", sectorSlug)
    .single();
  if (!sector) return { sectorName: sectorSlug, companies: [] };

  const { data: links } = await supabase
    .from("company_sectors")
    .select("company_id")
    .eq("sector_id", sector.id)
    .order("relevance_score", { ascending: false })
    .limit(limit);

  if (!links || links.length === 0) return { sectorName: sector.name, companies: [] };

  const ids = links.map((l: any) => l.company_id);
  const { data: companies } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories")
    .in("id", ids)
    .order("valuation", { ascending: false, nullsFirst: false });

  return { sectorName: sector.name, companies: companies || [] };
}

async function getEuropeanCompanies(limit = 50) {
  const euCountries = [
    "United Kingdom", "Germany", "France", "Switzerland", "Denmark",
    "Sweden", "Netherlands", "Belgium", "Ireland", "Norway",
    "Finland", "Italy", "Spain", "Austria", "Iceland",
  ];
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories, founded")
    .in("country", euCountries)
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getMarketSnapshots(limit = 100) {
  const { data } = await supabase
    .from("market_snapshots")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getLatestSnapshot() {
  const { data } = await supabase
    .from("market_snapshots")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function getFundingRounds(limit = 200) {
  const { data } = await supabase
    .from("funding_rounds")
    .select("company_name, round_type, amount_usd, announced_date, country, sector, lead_investor")
    .not("amount_usd", "is", null)
    .order("announced_date", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getTopGainersLosers(days = 7) {
  const since = daysAgo(days);
  const { data: gainers } = await supabase
    .from("company_price_history")
    .select("ticker, change_pct, market_cap_usd, date")
    .gte("date", since)
    .not("change_pct", "is", null)
    .order("change_pct", { ascending: false })
    .limit(10);

  const { data: losers } = await supabase
    .from("company_price_history")
    .select("ticker, change_pct, market_cap_usd, date")
    .gte("date", since)
    .not("change_pct", "is", null)
    .order("change_pct", { ascending: true })
    .limit(10);

  return { gainers: gainers || [], losers: losers || [] };
}

async function getSmallCapCompanies() {
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description, categories, founded")
    .not("valuation", "is", null)
    .gte("valuation", 100_000_000)
    .lte("valuation", 1_000_000_000)
    .order("valuation", { ascending: false })
    .limit(40);
  return data || [];
}

async function getPipelineData() {
  const { data } = await supabase
    .from("pipelines")
    .select("company_id, phase, overall_status, therapeutic_area")
    .limit(5000);
  return data || [];
}

async function getAllCompanyNames() {
  const all: { name: string; slug: string }[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("name, slug")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  return all;
}

async function getInvestorData() {
  const { data } = await supabase
    .from("funding_rounds")
    .select("lead_investor, amount_usd, round_type, announced_date, company_name, sector")
    .not("lead_investor", "is", null)
    .not("amount_usd", "is", null)
    .order("announced_date", { ascending: false })
    .limit(1000);
  return data || [];
}

/* ─── Article definitions ─── */

interface ArticleDef {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  buildPrompt: () => Promise<{ prompt: string; companies: { name: string; slug: string }[] }>;
}

const articles: ArticleDef[] = [
  // 1. Biotech Market Weekly
  {
    slug: `biotech-market-weekly-march-24-28-2026`,
    title: "Biotech Market Weekly: March 24-28, 2026",
    category: "weekly-recap",
    tags: ["weekly-recap", "market-analysis", "biotech-stocks", "march-2026"],
    buildPrompt: async () => {
      const snapshot = await getLatestSnapshot();
      const snapshots = await getMarketSnapshots(10);
      const { gainers, losers } = await getTopGainersLosers(7);
      const funding = await getFundingRounds(20);
      const recentFunding = funding.filter((r) => {
        const d = new Date(r.announced_date);
        return d >= new Date(daysAgo(14));
      });

      const companies = await getAllCompanyNames();

      const prompt = `Write a comprehensive weekly biotech market recap article titled "Biotech Market Weekly: March 24-28, 2026".

REAL DATA from our database:

Latest market snapshot:
${snapshot ? `- Date: ${snapshot.date}\n- Total market cap: ${fmt(snapshot.total_market_cap)}\n- Public companies tracked: ${snapshot.public_company_count}\n- 1-day change: ${fmtPct(snapshot.change_1d_pct)}\n- 7-day change: ${fmtPct(snapshot.change_7d_pct)}\n- 30-day change: ${fmtPct(snapshot.change_30d_pct)}\n- YTD change: ${fmtPct(snapshot.change_ytd_pct)}` : "No snapshot available"}

Recent market snapshots (last 10 days):
${snapshots.slice(0, 10).map((s) => `| ${s.date} | ${fmt(s.total_market_cap)} | ${fmtPct(s.change_1d_pct)} |`).join("\n")}

Top gainers this week:
${gainers.map((g) => `| ${g.ticker} | ${fmtPct(g.change_pct)} | ${fmt(g.market_cap_usd)} |`).join("\n")}

Top losers this week:
${losers.map((l) => `| ${l.ticker} | ${fmtPct(l.change_pct)} | ${fmt(l.market_cap_usd)} |`).join("\n")}

Recent funding rounds (last 2 weeks):
${recentFunding.slice(0, 15).map((r) => `| ${r.company_name} | ${r.round_type} | ${fmt(r.amount_usd)} | ${r.lead_investor || "N/A"} |`).join("\n")}

Structure:
1. Key Takeaways (blockquote box at top)
2. Market Overview — where the global biotech index finished, week-over-week change
3. Top Gainers & Losers table
4. Notable Funding Rounds table
5. Sector Performance — which therapeutic areas outperformed/underperformed
6. Regulatory & Pipeline News — reference any FDA decisions or major data readouts
7. What to Watch Next Week
8. Methodology note

Target keywords: "biotech market weekly", "biotech stocks this week", "biotech market recap march 2026"`;

      return { prompt, companies };
    },
  },

  // 2. Top 10 Most Valuable Biotech Companies
  {
    slug: "10-most-valuable-biotech-companies-2026",
    title: "The 10 Most Valuable Biotech Companies in 2026",
    category: "market-analysis",
    tags: ["market-cap", "rankings", "top-biotech", "2026", "large-cap"],
    buildPrompt: async () => {
      const companies = await getTopCompanies(15);
      const top10 = companies.slice(0, 10);

      const tableRows = top10
        .map(
          (c, i) =>
            `| ${i + 1} | [${c.name}](/company/${c.slug}) | ${c.country || "N/A"} | ${c.ticker || "Private"} | ${fmt(c.valuation)} | ${c.founded || "N/A"} | ${(c.categories || []).slice(0, 2).join(", ") || "N/A"} |`
        )
        .join("\n");

      const prompt = `Write a comprehensive deep-dive article titled "The 10 Most Valuable Biotech Companies in 2026".

REAL DATA — Top 10 biotech companies by market cap:

| Rank | Company | Country | Ticker | Market Cap | Founded | Focus |
|------|---------|---------|--------|------------|---------|-------|
${tableRows}

Additional context companies (#11-15):
${companies.slice(10, 15).map((c) => `- [${c.name}](/company/${c.slug}): ${fmt(c.valuation)} — ${c.country}`).join("\n")}

For EACH of the top 10, write a 200-300 word section covering:
- What they do and their core technology/products
- Key pipeline programs or revenue drivers
- Why they command their current valuation
- Recent catalysts or notable developments

Structure:
1. Key Takeaways blockquote
2. Introduction — the state of mega-cap biotech in 2026
3. The ranking table
4. Individual deep dives for each company (#1 through #10)
5. Common threads — what the top 10 have in common
6. The next contenders — companies approaching top-10 status
7. What this ranking tells us about biotech's direction
8. Methodology

Target keywords: "most valuable biotech companies 2026", "largest biotech companies", "top biotech stocks by market cap"`;

      return { prompt, companies };
    },
  },

  // 3. VC Money in 2026
  {
    slug: "biotech-vc-money-2026-funding-trends",
    title: "Where is Biotech VC Money Going in 2026?",
    category: "funding",
    tags: ["venture-capital", "funding", "vc", "2026", "biotech-investment"],
    buildPrompt: async () => {
      const rounds = await getFundingRounds(200);
      const companies = await getAllCompanyNames();

      // Group by round type
      const byType: Record<string, { count: number; total: number }> = {};
      for (const r of rounds) {
        const type = r.round_type || "Unknown";
        if (!byType[type]) byType[type] = { count: 0, total: 0 };
        byType[type].count++;
        byType[type].total += Number(r.amount_usd) || 0;
      }

      // Group by sector
      const bySector: Record<string, { count: number; total: number }> = {};
      for (const r of rounds) {
        const sector = r.sector || "Unknown";
        if (!bySector[sector]) bySector[sector] = { count: 0, total: 0 };
        bySector[sector].count++;
        bySector[sector].total += Number(r.amount_usd) || 0;
      }

      // Group by country
      const byCountry: Record<string, { count: number; total: number }> = {};
      for (const r of rounds) {
        const country = r.country || "Unknown";
        if (!byCountry[country]) byCountry[country] = { count: 0, total: 0 };
        byCountry[country].count++;
        byCountry[country].total += Number(r.amount_usd) || 0;
      }

      const totalRaised = rounds.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);

      const prompt = `Write a comprehensive article titled "Where is Biotech VC Money Going in 2026?".

REAL DATA from our funding database:

Overview: ${rounds.length} tracked funding rounds totaling ${fmt(totalRaised)}

By Round Type:
${Object.entries(byType).sort((a, b) => b[1].total - a[1].total).map(([type, d]) => `| ${type} | ${d.count} deals | ${fmt(d.total)} |`).join("\n")}

By Sector:
${Object.entries(bySector).sort((a, b) => b[1].total - a[1].total).slice(0, 15).map(([sector, d]) => `| ${sector} | ${d.count} deals | ${fmt(d.total)} |`).join("\n")}

By Country:
${Object.entries(byCountry).sort((a, b) => b[1].total - a[1].total).slice(0, 12).map(([country, d]) => `| ${country} | ${d.count} deals | ${fmt(d.total)} |`).join("\n")}

Top 20 largest rounds:
${rounds.slice(0, 20).map((r) => `| ${r.company_name} | ${r.round_type || "N/A"} | ${fmt(r.amount_usd)} | ${r.country || "N/A"} | ${r.sector || "N/A"} | ${r.lead_investor || "N/A"} |`).join("\n")}

Structure:
1. Key Takeaways
2. The Big Picture — total capital deployed, how it compares to recent years
3. Round type analysis table — where in the lifecycle is money flowing
4. Sector breakdown table — which therapeutic areas attract the most
5. Geographic trends table — US dominance vs emerging hubs
6. Mega-rounds analysis — the biggest deals and what they signal
7. Investor spotlight — most active lead investors
8. The Series A crunch vs late-stage abundance
9. Outlook for the rest of 2026
10. Methodology

Target keywords: "biotech VC funding 2026", "biotech venture capital trends", "where VCs investing biotech"`;

      return { prompt, companies };
    },
  },

  // 4. European Biotech
  {
    slug: "biotech-companies-to-watch-europe-2026",
    title: "Biotech Companies to Watch in Europe",
    category: "market-analysis",
    tags: ["europe", "biotech-europe", "uk-biotech", "swiss-biotech", "danish-biotech"],
    buildPrompt: async () => {
      const companies = await getEuropeanCompanies(50);

      // Country breakdown
      const byCountry: Record<string, typeof companies> = {};
      for (const c of companies) {
        const country = c.country || "Unknown";
        if (!byCountry[country]) byCountry[country] = [];
        byCountry[country].push(c);
      }

      const tableRows = companies
        .slice(0, 30)
        .map(
          (c, i) =>
            `| ${i + 1} | [${c.name}](/company/${c.slug}) | ${c.country} | ${c.ticker || "Private"} | ${fmt(c.valuation)} |`
        )
        .join("\n");

      const countryTable = Object.entries(byCountry)
        .sort((a, b) => {
          const aTotal = a[1].reduce((s, c) => s + Number(c.valuation || 0), 0);
          const bTotal = b[1].reduce((s, c) => s + Number(c.valuation || 0), 0);
          return bTotal - aTotal;
        })
        .slice(0, 10)
        .map(([country, cos]) => {
          const total = cos.reduce((s, c) => s + Number(c.valuation || 0), 0);
          return `| ${country} | ${cos.length} | ${fmt(total)} | ${cos[0]?.name || "N/A"} |`;
        })
        .join("\n");

      const prompt = `Write a comprehensive article titled "Biotech Companies to Watch in Europe".

REAL DATA from our database:

Top 30 European biotech companies by market cap:

| Rank | Company | Country | Ticker | Market Cap |
|------|---------|---------|--------|------------|
${tableRows}

Country breakdown:

| Country | Companies | Combined Market Cap | Top Company |
|---------|-----------|-------------------|-------------|
${countryTable}

Structure:
1. Key Takeaways
2. Introduction — Europe's biotech ecosystem is maturing
3. The full ranking table of Europe's top 30
4. Country-by-country deep dive:
   - Switzerland — the pharma hub
   - United Kingdom — post-Brexit biotech
   - Denmark — the Nordic powerhouse
   - Germany — BioNTech and beyond
   - France — Sanofi ecosystem
   - Sweden, Netherlands, Belgium, others
5. European vs American biotech — structural differences
6. European funding landscape
7. Regulatory environment (EMA) advantages
8. Companies to watch — the next wave
9. Methodology

Target keywords: "European biotech companies", "best biotech stocks Europe", "biotech companies UK Germany Switzerland"`;

      return { prompt, companies };
    },
  },

  // 5. GLP-1 Revolution
  {
    slug: "glp-1-revolution-companies-beyond-eli-lilly-novo-nordisk",
    title: "The GLP-1 Revolution: Companies Beyond Eli Lilly and Novo Nordisk",
    category: "sector-reports",
    tags: ["glp-1", "obesity", "diabetes", "weight-loss", "pharma"],
    buildPrompt: async () => {
      // Search for obesity/diabetes/GLP-1 related companies
      const { data: obesityCos } = await supabase
        .from("companies")
        .select("name, slug, country, valuation, ticker, description, categories")
        .or("description.ilike.%glp-1%,description.ilike.%obesity%,description.ilike.%weight loss%,description.ilike.%diabetes%,description.ilike.%incretin%,description.ilike.%semaglutide%,categories.cs.{obesity},categories.cs.{diabetes}")
        .order("valuation", { ascending: false, nullsFirst: false })
        .limit(30);

      const companies = obesityCos || [];
      const allCo = await getAllCompanyNames();

      const companyList = companies
        .map((c) => `| [${c.name}](/company/${c.slug}) | ${c.country || "N/A"} | ${c.ticker || "Private"} | ${fmt(c.valuation)} | ${(c.description || "").slice(0, 120)} |`)
        .join("\n");

      const prompt = `Write a comprehensive article titled "The GLP-1 Revolution: Companies Beyond Eli Lilly and Novo Nordisk".

REAL DATA — companies in our database related to GLP-1/obesity/diabetes:

| Company | Country | Ticker | Market Cap | Description |
|---------|---------|--------|------------|-------------|
${companyList}

Structure:
1. Key Takeaways
2. Introduction — the GLP-1 market is projected to reach $100B+, but most coverage focuses only on Ozempic/Wegovy (Novo Nordisk) and Mounjaro/Zepbound (Eli Lilly). What about the rest?
3. How GLP-1s work — receptor agonists, mechanism of action, beyond diabetes
4. The current market — Novo Nordisk and Eli Lilly dominance
5. The challengers table — companies with GLP-1 or obesity programs
6. Next-generation approaches:
   - Oral GLP-1s
   - Dual/triple agonists (GLP-1/GIP/glucagon)
   - Amylin combinations
   - Non-GLP-1 obesity mechanisms (activin, leptin, etc.)
7. Pipeline analysis — which companies have late-stage programs
8. Supply chain dynamics — the manufacturing bottleneck
9. Investment implications — who could be the next winner
10. Methodology

Target keywords: "GLP-1 companies", "obesity drug companies", "weight loss drugs beyond Ozempic", "GLP-1 stocks"`;

      return { prompt, companies: allCo };
    },
  },

  // 6. Stocks That Doubled
  {
    slug: "biotech-stocks-that-doubled-last-year",
    title: "Biotech Stocks That Doubled in the Last Year",
    category: "market-analysis",
    tags: ["stock-performance", "top-performers", "biotech-stocks", "returns"],
    buildPrompt: async () => {
      // Get companies with significant price gains using price history
      const yearAgo = daysAgo(365);
      const { data: priceData } = await supabase
        .from("company_price_history")
        .select("ticker, market_cap_usd, change_pct, date")
        .gte("date", yearAgo)
        .not("change_pct", "is", null)
        .order("change_pct", { ascending: false })
        .limit(500);

      // Also get top companies by valuation that have tickers
      const topPublic = await getTopCompanies(30);
      const publicCos = topPublic.filter((c) => c.ticker);

      const allCo = await getAllCompanyNames();

      const prompt = `Write a comprehensive article titled "Biotech Stocks That Doubled in the Last Year".

REAL DATA from our database:

Top public biotech companies with recent price data:
${publicCos.slice(0, 20).map((c) => `| [${c.name}](/company/${c.slug}) | ${c.ticker} | ${fmt(c.valuation)} | ${c.country} |`).join("\n")}

Recent top daily gainers from our price history (sample):
${(priceData || []).slice(0, 20).map((p) => `| ${p.ticker} | ${fmtPct(p.change_pct)} | ${fmt(p.market_cap_usd)} | ${p.date} |`).join("\n")}

Structure:
1. Key Takeaways
2. Introduction — in a year where broader markets did X, several biotechs delivered 100%+ returns
3. Screening methodology — how we identified the top performers
4. The top performers table with price gains, market cap before/after
5. What drove the gains:
   - FDA approvals (binary catalyst events)
   - Positive clinical trial data
   - M&A speculation and takeover premiums
   - Commercial launch outperformance
6. Pattern analysis — what top performers had in common
7. Case studies — deep dive on 3-4 standout companies
8. The other side — companies that crashed after catalysts
9. Lessons for investors — finding the next doubler
10. Methodology

Target keywords: "biotech stocks that doubled", "best performing biotech stocks", "top biotech stock returns"`;

      return { prompt, companies: allCo };
    },
  },

  // 7. Market Cycles 35 Years
  {
    slug: "biotech-market-cycles-35-years-data-lessons",
    title: "Understanding Biotech Market Cycles: Lessons from 35 Years of Data",
    category: "market-analysis",
    tags: ["market-cycles", "biotech-history", "investment", "market-trends"],
    buildPrompt: async () => {
      const snapshots = await getMarketSnapshots(100);
      const allCo = await getAllCompanyNames();

      // Sample snapshots to show trajectory
      const sampled = snapshots
        .filter((_s, i) => i % Math.max(1, Math.floor(snapshots.length / 20)) === 0 || i === 0)
        .reverse();

      const prompt = `Write a comprehensive article titled "Understanding Biotech Market Cycles: Lessons from 35 Years of Data".

REAL DATA — market snapshots from our database:

| Date | Total Market Cap | Public Companies | 7d Change | 30d Change | YTD Change |
|------|-----------------|------------------|-----------|------------|------------|
${sampled.map((s) => `| ${s.date} | ${fmt(s.total_market_cap)} | ${s.public_company_count} | ${fmtPct(s.change_7d_pct)} | ${fmtPct(s.change_30d_pct)} | ${fmtPct(s.change_ytd_pct)} |`).join("\n")}

Latest snapshot: ${snapshots[0] ? `${fmt(snapshots[0].total_market_cap)} total market cap across ${snapshots[0].public_company_count} public companies` : "N/A"}

Structure:
1. Key Takeaways
2. Introduction — biotech is one of the most cyclical industries, and understanding the pattern is essential
3. Market cap evolution table from our data
4. The five major biotech cycles:
   - 1991-1994: The Amgen/Genentech era and first biotech bubble
   - 2000-2003: Genomics bubble and bust
   - 2013-2016: The golden age of biotech
   - 2020-2021: COVID-driven boom
   - 2022-2024: The biotech bear market
   - 2025-present: the current recovery
5. Anatomy of a biotech cycle — what drives booms and busts
6. Key indicators that signal cycle turns (IPO window, XBI levels, crossover investors)
7. How sector composition changes across cycles
8. Survivor analysis — which companies persist through cycles
9. Current positioning — where are we in the cycle now
10. Methodology

Target keywords: "biotech market cycles", "biotech market history", "biotech bull bear market patterns"`;

      return { prompt, companies: allCo };
    },
  },

  // 8. Most Active Biotech Investors
  {
    slug: "20-most-active-biotech-investors-2026",
    title: "The 20 Most Active Biotech Investors in 2026",
    category: "funding",
    tags: ["investors", "venture-capital", "biotech-investment", "portfolio", "2026"],
    buildPrompt: async () => {
      const investorData = await getInvestorData();
      const allCo = await getAllCompanyNames();

      // Aggregate by investor
      const investorMap: Record<string, { deals: number; totalCapital: number; companies: string[]; sectors: string[] }> = {};
      for (const r of investorData) {
        const inv = r.lead_investor;
        if (!inv || inv === "N/A" || inv.length < 3) continue;
        if (!investorMap[inv]) investorMap[inv] = { deals: 0, totalCapital: 0, companies: [], sectors: [] };
        investorMap[inv].deals++;
        investorMap[inv].totalCapital += Number(r.amount_usd) || 0;
        if (r.company_name && !investorMap[inv].companies.includes(r.company_name)) {
          investorMap[inv].companies.push(r.company_name);
        }
        if (r.sector && !investorMap[inv].sectors.includes(r.sector)) {
          investorMap[inv].sectors.push(r.sector);
        }
      }

      const topInvestors = Object.entries(investorMap)
        .sort((a, b) => b[1].deals - a[1].deals)
        .slice(0, 25);

      const investorTable = topInvestors
        .map(([name, d], i) => `| ${i + 1} | ${name} | ${d.deals} | ${fmt(d.totalCapital)} | ${d.sectors.slice(0, 3).join(", ")} |`)
        .join("\n");

      const prompt = `Write a comprehensive article titled "The 20 Most Active Biotech Investors in 2026".

REAL DATA from our funding database:

Top investors by deal count:

| Rank | Investor | Deals | Capital Deployed | Top Sectors |
|------|----------|-------|-----------------|-------------|
${investorTable}

Total tracked: ${investorData.length} funding rounds with identified lead investors

Sample portfolio companies for top investors:
${topInvestors.slice(0, 10).map(([name, d]) => `- ${name}: ${d.companies.slice(0, 5).join(", ")}`).join("\n")}

Structure:
1. Key Takeaways
2. Introduction — the VC landscape in biotech is both concentrated and evolving
3. Methodology — how we track and rank investors
4. The top 20 table
5. Tier analysis:
   - The mega-funds ($1B+ biotech allocations)
   - Specialist biotech VCs
   - Corporate venture arms (pharma CVCs)
   - Crossover investors (hedge funds doing private rounds)
6. Investment strategy comparison — what they look for
7. Geographic preferences — US-centric vs global investors
8. Sector preferences — oncology vs platform vs rare disease
9. The LP perspective — returns in biotech VC
10. Methodology

Target keywords: "top biotech investors 2026", "biotech venture capital firms", "most active biotech VCs"`;

      return { prompt, companies: allCo };
    },
  },

  // 9. Small Cap Hidden Gems
  {
    slug: "small-cap-biotech-hidden-gems-under-1-billion",
    title: "Small Cap Biotech: Hidden Gems Under $1 Billion",
    category: "market-analysis",
    tags: ["small-cap", "biotech-stocks", "hidden-gems", "micro-cap", "screening"],
    buildPrompt: async () => {
      const companies = await getSmallCapCompanies();
      const allCo = await getAllCompanyNames();

      const tableRows = companies
        .slice(0, 30)
        .map(
          (c, i) =>
            `| ${i + 1} | [${c.name}](/company/${c.slug}) | ${c.country || "N/A"} | ${c.ticker || "Private"} | ${fmt(c.valuation)} | ${(c.categories || []).slice(0, 2).join(", ") || "N/A"} |`
        )
        .join("\n");

      const prompt = `Write a comprehensive article titled "Small Cap Biotech: Hidden Gems Under $1 Billion".

REAL DATA — biotech companies with market cap between $100M and $1B:

| Rank | Company | Country | Ticker | Market Cap | Focus Area |
|------|---------|---------|--------|------------|------------|
${tableRows}

Total companies in the $100M-$1B range: ${companies.length} tracked

Structure:
1. Key Takeaways
2. Introduction — why small-cap biotech deserves attention (this is where big pharma finds its next acquisition targets)
3. Our screening criteria — how we filtered the universe
4. The small cap landscape table
5. Why small caps matter:
   - Acquisition targets (historical buyout premiums of 50-100%)
   - Binary catalyst upside
   - Under-followed by Wall Street
6. Sector breakdown — which therapeutic areas have the most small-cap opportunity
7. Geographic distribution — not just a US story
8. Red flags to watch — liquidity, cash runway, management turnover
9. Five companies to research further (pick 5 interesting ones from the data)
10. How to build a small-cap biotech watchlist
11. Methodology

Target keywords: "small cap biotech stocks", "biotech hidden gems", "small cap biotech companies under $1 billion"`;

      return { prompt, companies: allCo };
    },
  },

  // 10. Clinical Trial Success Rates
  {
    slug: "clinical-trial-success-rates-by-phase-data-analysis",
    title: "Clinical Trial Success Rates by Phase: What the Data Shows",
    category: "guides",
    tags: ["clinical-trials", "success-rates", "drug-development", "pipeline", "fda"],
    buildPrompt: async () => {
      const pipelineData = await getPipelineData();
      const allCo = await getAllCompanyNames();

      // Aggregate by phase
      const byPhase: Record<string, { total: number; statuses: Record<string, number> }> = {};
      for (const p of pipelineData) {
        const phase = p.phase || "Unknown";
        if (!byPhase[phase]) byPhase[phase] = { total: 0, statuses: {} };
        byPhase[phase].total++;
        const status = p.overall_status || "Unknown";
        byPhase[phase].statuses[status] = (byPhase[phase].statuses[status] || 0) + 1;
      }

      // Aggregate by therapeutic area
      const byArea: Record<string, number> = {};
      for (const p of pipelineData) {
        const area = p.therapeutic_area || "Unknown";
        byArea[area] = (byArea[area] || 0) + 1;
      }

      const phaseTable = Object.entries(byPhase)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([phase, d]) => {
          const recruiting = d.statuses["RECRUITING"] || d.statuses["Recruiting"] || 0;
          const completed = d.statuses["COMPLETED"] || d.statuses["Completed"] || 0;
          const terminated = d.statuses["TERMINATED"] || d.statuses["Terminated"] || 0;
          return `| ${phase} | ${d.total} | ${recruiting} | ${completed} | ${terminated} |`;
        })
        .join("\n");

      const areaTable = Object.entries(byArea)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([area, count]) => `| ${area} | ${count} |`)
        .join("\n");

      const prompt = `Write a comprehensive article titled "Clinical Trial Success Rates by Phase: What the Data Shows".

REAL DATA from our pipeline database (${pipelineData.length} total clinical trials tracked):

Trials by phase:

| Phase | Total Trials | Recruiting | Completed | Terminated |
|-------|-------------|------------|-----------|------------|
${phaseTable}

Top therapeutic areas by trial count:

| Therapeutic Area | Trials |
|-----------------|--------|
${areaTable}

Structure:
1. Key Takeaways
2. Introduction — understanding clinical trial success rates is crucial for biotech investors
3. Our dataset — ${pipelineData.length} clinical trials tracked across phases
4. Phase-by-phase analysis table:
   - Preclinical to Phase 1 transition rates
   - Phase 1 to Phase 2 (safety to efficacy)
   - Phase 2 to Phase 3 (the "valley of death")
   - Phase 3 to FDA Approval
5. Overall probability of success from Phase 1 to approval
6. Success rates by therapeutic area table — oncology vs rare disease vs infectious disease
7. Why most drugs fail — the top reasons for clinical trial failure
8. How trial design is evolving (adaptive trials, biomarker enrichment, decentralized trials)
9. What this means for investors — calibrating expectations
10. How BiotechTube tracks pipeline data
11. Methodology

Target keywords: "clinical trial success rates by phase", "drug development success rate", "biotech pipeline success probability"`;

      return { prompt, companies: allCo };
    },
  },
];

/* ─── Main ─── */

async function main() {
  console.log("=== Premium Article Generator ===\n");
  console.log(`Generating ${articles.length} data-driven articles...\n`);

  // Check existing articles
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("slug");
  const existingSlugs = new Set((existing || []).map((e: any) => e.slug));

  // Get all company names for auto-linking
  console.log("Loading company names for auto-linking...");
  const allCompanies = await getAllCompanyNames();
  console.log(`  Loaded ${allCompanies.length} companies\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const article of articles) {
    if (existingSlugs.has(article.slug)) {
      console.log(`SKIP: "${article.title}" (already exists)`);
      skipped++;
      continue;
    }

    console.log(`\nGENERATING: "${article.title}"`);
    console.log(`  Querying database for real data...`);

    try {
      const { prompt, companies: articleCompanies } = await article.buildPrompt();

      console.log(`  Calling DeepSeek API...`);
      let content = await callDeepSeek(prompt);

      // Auto-link any company names that weren't already linked
      console.log(`  Auto-linking company names...`);
      const companiesToLink = articleCompanies.length > 0 ? articleCompanies : allCompanies;
      content = addInternalLinks(content, companiesToLink);

      // Count internal links
      const linkCount = (content.match(/\[([^\]]+)\]\(\/company\//g) || []).length;
      console.log(`  Found ${linkCount} internal company links`);

      // Word count
      const wordCount = content.split(/\s+/).length;
      console.log(`  Article length: ${wordCount} words`);

      // Extract excerpt
      const firstPara = content
        .split("\n\n")
        .find((p) => p.trim() && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("-") && !p.startsWith(">"));
      const excerpt = firstPara
        ? firstPara.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").slice(0, 300)
        : "";

      // Insert into database
      const { error } = await supabase.from("blog_posts").insert({
        slug: article.slug,
        title: article.title,
        content,
        excerpt,
        category: article.category,
        tags: article.tags,
        author: "BiotechTube Research",
        meta_title: article.title,
        meta_description: excerpt.slice(0, 155) + "...",
        status: "published",
      });

      if (error) {
        console.error(`  ERROR inserting: ${error.message}`);
        errors++;
      } else {
        console.log(`  INSERTED: "${article.title}"`);
        generated++;
      }

      // Rate limit between API calls
      await sleep(3000);
    } catch (err: any) {
      console.error(`  ERROR: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Generated: ${generated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total defined: ${articles.length}`);
}

main().catch(console.error);
