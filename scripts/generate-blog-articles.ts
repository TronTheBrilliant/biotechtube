#!/usr/bin/env npx tsx
/**
 * Generate 15 evergreen blog articles using DeepSeek API
 * and insert them into the blog_posts table.
 *
 * Usage: npx tsx scripts/generate-blog-articles.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

/* ─── Helpers ─── */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatMarketCap(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

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
          content:
            "You are a senior biotech market analyst writing for BiotechTube, a biotech intelligence platform. Write in a professional, data-driven tone. Never sound AI-generated — write like a financial journalist at STAT News or Endpoints News. Use markdown formatting with ## headings. Include markdown tables where relevant. Always use factual data provided to you. Include internal links in the format [Company Name](/company/company-slug) when mentioning companies tracked on BiotechTube.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
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

/* ─── Data queries ─── */

async function getTopCompaniesByMarketCap(limit = 50) {
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, categories")
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

  const ids = links.map((l: { company_id: string }) => l.company_id);
  const { data: companies } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker, description")
    .in("id", ids)
    .order("valuation", { ascending: false, nullsFirst: false });

  return { sectorName: sector.name, companies: companies || [] };
}

async function getCompaniesByCountry(country: string, limit = 30) {
  const { data } = await supabase
    .from("companies")
    .select("name, slug, valuation, ticker, categories")
    .eq("country", country)
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getEuropeanCompanies(limit = 40) {
  const euCountries = [
    "United Kingdom", "Germany", "France", "Switzerland", "Denmark",
    "Sweden", "Netherlands", "Belgium", "Ireland", "Norway",
    "Finland", "Italy", "Spain", "Austria", "Iceland",
  ];
  const { data } = await supabase
    .from("companies")
    .select("name, slug, country, valuation, ticker")
    .in("country", euCountries)
    .not("valuation", "is", null)
    .order("valuation", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getMarketHistory() {
  const { data } = await supabase
    .from("market_snapshots")
    .select("snapshot_date, total_market_cap, total_companies_tracked, public_companies_count")
    .order("snapshot_date", { ascending: true })
    .limit(500);
  return data || [];
}

async function getFundingData() {
  const { data } = await supabase
    .from("funding_rounds")
    .select("company_name, round_type, amount_usd, announced_date, country, sector, lead_investor")
    .not("amount_usd", "is", null)
    .order("announced_date", { ascending: false })
    .limit(100);
  return data || [];
}

/* ─── Article definitions ─── */

interface ArticleDef {
  slug: string;
  titleTemplate: string;
  category: string;
  tags: string[];
  buildPrompt: () => Promise<string>;
}

const articles: ArticleDef[] = [
  {
    slug: "top-50-biotech-companies-by-market-cap-2026",
    titleTemplate: "Top 50 Biotech Companies by Market Cap in 2026",
    category: "market-analysis",
    tags: ["market-cap", "rankings", "biotech-companies", "2026"],
    buildPrompt: async () => {
      const companies = await getTopCompaniesByMarketCap(50);
      const tableRows = companies
        .map(
          (c, i) =>
            `| ${i + 1} | [${c.name}](/company/${c.slug}) | ${c.country || "N/A"} | ${c.ticker || "Private"} | ${c.valuation ? formatMarketCap(Number(c.valuation)) : "N/A"} |`
        )
        .join("\n");
      return `Write a 2000-word article titled "Top 50 Biotech Companies by Market Cap in 2026".

Include this data table of the top 50 biotech companies:

| Rank | Company | Country | Ticker | Market Cap |
|------|---------|---------|--------|------------|
${tableRows}

Structure the article with:
1. An introduction about the current state of the global biotech market
2. The full ranking table
3. Analysis of the top 10 companies and what drives their valuations
4. Regional breakdown (US vs Europe vs Asia)
5. Key trends — which therapeutic areas dominate the top ranks
6. Conclusion with outlook

Use the company links in [Company Name](/company/slug) format. Target keywords: "top biotech companies", "biotech market cap", "largest biotech companies 2026".`;
    },
  },
  {
    slug: "complete-guide-car-t-therapy-companies",
    titleTemplate: "The Complete Guide to CAR-T Therapy Companies",
    category: "sector-reports",
    tags: ["car-t", "cell-therapy", "immunotherapy", "oncology"],
    buildPrompt: async () => {
      const { sectorName, companies } = await getCompaniesBySector("cell-therapy");
      const companyList = companies
        .slice(0, 25)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}${c.description ? ` — ${c.description.slice(0, 100)}` : ""}`)
        .join("\n");
      return `Write a 2000-word article titled "The Complete Guide to CAR-T Therapy Companies".

Here are ${sectorName} companies from our database:
${companyList}

Structure:
1. Introduction: what is CAR-T therapy, why it matters
2. How CAR-T therapy works (brief, accessible explanation)
3. Table of leading CAR-T companies with market cap and focus area
4. Approved CAR-T therapies on the market
5. Next-generation CAR-T approaches (allogeneic, solid tumors, etc.)
6. Investment landscape and market size projections
7. Challenges and future outlook

Use internal links [Company Name](/company/slug). Target keywords: "CAR-T therapy companies", "cell therapy companies", "CAR-T stocks".`;
    },
  },
  {
    slug: "crispr-gene-editing-companies-leading-revolution",
    titleTemplate: "CRISPR Gene Editing Companies: Who's Leading the Revolution",
    category: "sector-reports",
    tags: ["crispr", "gene-editing", "gene-therapy", "genomics"],
    buildPrompt: async () => {
      const { companies } = await getCompaniesBySector("crispr-gene-editing");
      const companyList = companies
        .slice(0, 20)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}`)
        .join("\n");
      return `Write a 2000-word article titled "CRISPR Gene Editing Companies: Who's Leading the Revolution".

CRISPR/Gene Editing companies from our database:
${companyList}

Structure:
1. Introduction to CRISPR and why 2026 is a landmark year
2. The science: CRISPR-Cas9, base editing, prime editing
3. Table of key CRISPR companies with market cap, pipeline focus
4. Casgevy approval and what it means for the field
5. Beyond blood disorders: next frontiers (in vivo editing, cancer, etc.)
6. Competitive landscape and IP considerations
7. Investment thesis and risks
8. Conclusion

Target keywords: "CRISPR companies", "gene editing stocks", "CRISPR gene therapy companies".`;
    },
  },
  {
    slug: "mrna-technology-companies-beyond-covid",
    titleTemplate: "mRNA Technology: Companies Pushing the Boundaries Beyond COVID",
    category: "sector-reports",
    tags: ["mrna", "vaccines", "rna-therapeutics", "moderna", "biontech"],
    buildPrompt: async () => {
      const { companies } = await getCompaniesBySector("mrna");
      const companyList = companies
        .slice(0, 20)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}`)
        .join("\n");
      return `Write a 2000-word article titled "mRNA Technology: Companies Pushing the Boundaries Beyond COVID".

mRNA companies from our database:
${companyList}

Structure:
1. Introduction: mRNA's post-COVID evolution
2. How mRNA therapeutics work beyond vaccines
3. Table of leading mRNA companies and their pipeline focus areas
4. Cancer vaccines and personalized medicine applications
5. Rare disease and protein replacement therapy
6. Next-gen delivery systems (LNP improvements, targeted delivery)
7. Market projections and investment outlook
8. Conclusion

Target keywords: "mRNA companies", "mRNA technology stocks", "mRNA therapeutics beyond COVID".`;
    },
  },
  {
    slug: "ai-drug-discovery-companies-transforming-pharma",
    titleTemplate: "AI in Drug Discovery: The Companies Transforming Pharma",
    category: "sector-reports",
    tags: ["ai", "machine-learning", "drug-discovery", "computational-biology"],
    buildPrompt: async () => {
      const { companies } = await getCompaniesBySector("ai-machine-learning");
      const companyList = companies
        .slice(0, 25)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}`)
        .join("\n");
      return `Write a 2000-word article titled "AI in Drug Discovery: The Companies Transforming Pharma".

AI/ML biotech companies from our database:
${companyList}

Structure:
1. Introduction: why AI is reshaping drug development
2. How AI accelerates drug discovery (target identification, molecule design, clinical trial optimization)
3. Table of leading AI drug discovery companies with valuation and focus
4. Success stories: AI-designed drugs in clinical trials
5. Big pharma partnerships and acquisition trends
6. Business model comparison (platform vs pipeline companies)
7. Challenges: data quality, regulatory acceptance, reproducibility
8. Investment landscape and outlook

Target keywords: "AI drug discovery companies", "AI biotech stocks", "artificial intelligence pharmaceutical companies".`;
    },
  },
  {
    slug: "biotech-funding-2026-where-vcs-investing",
    titleTemplate: "Biotech Funding in 2026: Where VCs Are Investing",
    category: "funding",
    tags: ["funding", "venture-capital", "investment", "biotech-vc", "2026"],
    buildPrompt: async () => {
      const rounds = await getFundingData();
      const totalRaised = rounds.reduce((sum, r) => sum + (Number(r.amount_usd) || 0), 0);
      const topRounds = rounds
        .slice(0, 20)
        .map((r) => `| ${r.company_name} | ${r.round_type || "N/A"} | ${r.amount_usd ? formatMarketCap(Number(r.amount_usd)) : "N/A"} | ${r.country || "N/A"} | ${r.sector || "N/A"} | ${r.lead_investor || "N/A"} |`)
        .join("\n");
      return `Write a 2000-word article titled "Biotech Funding in 2026: Where VCs Are Investing".

Recent funding rounds from our database (total tracked: ${formatMarketCap(totalRaised)} across ${rounds.length} rounds):

| Company | Round | Amount | Country | Sector | Lead Investor |
|---------|-------|--------|---------|--------|---------------|
${topRounds}

Structure:
1. Introduction: state of biotech venture funding in 2026
2. Table of recent major funding rounds
3. Sector breakdown: which therapeutic areas attract the most capital
4. Geographic trends in biotech funding
5. Stage analysis: seed vs Series A vs late-stage trends
6. Top active investors in biotech
7. IPO market conditions and exit landscape
8. Outlook for H2 2026

Target keywords: "biotech funding 2026", "biotech venture capital", "biotech investment trends".`;
    },
  },
  {
    slug: "rise-of-european-biotech-market-overview",
    titleTemplate: "The Rise of European Biotech: Market Overview",
    category: "market-analysis",
    tags: ["europe", "biotech-europe", "market-analysis", "uk", "germany", "switzerland"],
    buildPrompt: async () => {
      const companies = await getEuropeanCompanies(40);
      const tableRows = companies
        .slice(0, 30)
        .map((c, i) => `| ${i + 1} | [${c.name}](/company/${c.slug}) | ${c.country} | ${c.ticker || "Private"} | ${c.valuation ? formatMarketCap(Number(c.valuation)) : "N/A"} |`)
        .join("\n");
      return `Write a 2000-word article titled "The Rise of European Biotech: Market Overview".

Top European biotech companies from our database:

| Rank | Company | Country | Ticker | Market Cap |
|------|---------|---------|--------|------------|
${tableRows}

Structure:
1. Introduction: Europe's growing role in global biotech
2. Full ranking table of top European companies
3. Country-by-country analysis (UK, Switzerland, Germany, Denmark, France, Sweden)
4. Key biotech hubs and clusters in Europe
5. Regulatory landscape: EMA advantages and challenges
6. European biotech funding environment
7. How European biotech differs from US biotech
8. Conclusion and outlook

Target keywords: "European biotech companies", "biotech Europe", "top European biotech stocks".`;
    },
  },
  {
    slug: "japanese-biotech-market-companies-to-watch",
    titleTemplate: "Japanese Biotech Market: Companies to Watch",
    category: "market-analysis",
    tags: ["japan", "asia-biotech", "japanese-pharma", "market-analysis"],
    buildPrompt: async () => {
      const companies = await getCompaniesByCountry("Japan", 25);
      const tableRows = companies
        .map((c, i) => `| ${i + 1} | [${c.name}](/company/${c.slug}) | ${c.ticker || "Private"} | ${c.valuation ? formatMarketCap(Number(c.valuation)) : "N/A"} |`)
        .join("\n");
      return `Write a 2000-word article titled "Japanese Biotech Market: Companies to Watch".

Japanese biotech/pharma companies from our database:

| Rank | Company | Ticker | Market Cap |
|------|---------|--------|------------|
${tableRows}

Structure:
1. Introduction: Japan's unique position in global biotech
2. Table of top Japanese biotech companies
3. Japan's pharmaceutical heritage and transition to biotech
4. Key therapeutic focus areas (antibodies, regenerative medicine, oncology)
5. Regulatory environment: PMDA and accelerated approvals
6. Japan's biotech startup ecosystem
7. Cross-border partnerships (Japan-US, Japan-China)
8. Investment considerations for international investors
9. Conclusion

Target keywords: "Japanese biotech companies", "Japan biotech stocks", "Japanese pharmaceutical companies".`;
    },
  },
  {
    slug: "small-molecule-drugs-backbone-of-pharma",
    titleTemplate: "Small Molecule Drugs: The Backbone of Pharma",
    category: "sector-reports",
    tags: ["small-molecules", "drug-development", "medicinal-chemistry", "pharma"],
    buildPrompt: async () => {
      const { companies } = await getCompaniesBySector("small-molecules");
      const companyList = companies
        .slice(0, 25)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}`)
        .join("\n");
      return `Write a 2000-word article titled "Small Molecule Drugs: The Backbone of Pharma".

Small molecule drug companies from our database:
${companyList}

Structure:
1. Introduction: why small molecules still dominate drug approvals
2. Small molecules vs biologics: advantages and limitations
3. Table of leading small molecule companies
4. Innovation in small molecule design (PROTACs, molecular glues, targeted degradation)
5. Key therapeutic areas for small molecules
6. The oral drug advantage in patient compliance
7. Market size and growth projections
8. Conclusion

Target keywords: "small molecule drug companies", "small molecule drugs", "small molecule pharma stocks".`;
    },
  },
  {
    slug: "immunotherapy-companies-race-against-cancer",
    titleTemplate: "Immunotherapy Companies: The Race Against Cancer",
    category: "sector-reports",
    tags: ["immunotherapy", "immuno-oncology", "cancer", "checkpoint-inhibitors"],
    buildPrompt: async () => {
      const { companies } = await getCompaniesBySector("immunotherapy");
      const companyList = companies
        .slice(0, 25)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}`)
        .join("\n");
      return `Write a 2000-word article titled "Immunotherapy Companies: The Race Against Cancer".

Immunotherapy/Immuno-Oncology companies from our database:
${companyList}

Structure:
1. Introduction: immunotherapy as the fourth pillar of cancer treatment
2. Types of immunotherapy (checkpoint inhibitors, CAR-T, bispecifics, cancer vaccines, oncolytic viruses)
3. Table of leading immunotherapy companies with market cap and key programs
4. Approved immuno-oncology drugs and their market performance
5. Next-generation approaches and combination therapies
6. Biomarkers and patient selection
7. Market size and competitive dynamics
8. Conclusion

Target keywords: "immunotherapy companies", "immuno-oncology stocks", "cancer immunotherapy companies".`;
    },
  },
  {
    slug: "gene-therapy-companies-complete-landscape-guide",
    titleTemplate: "Gene Therapy Companies: A Complete Landscape Guide",
    category: "guides",
    tags: ["gene-therapy", "aav", "lentivirus", "genetic-diseases"],
    buildPrompt: async () => {
      const cellGene = await getCompaniesBySector("cell-therapy");
      const crispr = await getCompaniesBySector("crispr-gene-editing");
      const allCompanies = [...(cellGene.companies || []), ...(crispr.companies || [])];
      // Deduplicate by slug
      const seen = new Set<string>();
      const unique = allCompanies.filter((c) => {
        if (seen.has(c.slug)) return false;
        seen.add(c.slug);
        return true;
      });
      const companyList = unique
        .slice(0, 25)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}`)
        .join("\n");
      return `Write a 2000-word article titled "Gene Therapy Companies: A Complete Landscape Guide".

Gene therapy companies (cell/gene therapy + CRISPR sectors) from our database:
${companyList}

Structure:
1. Introduction: the promise of gene therapy
2. Gene therapy modalities: AAV, lentiviral, non-viral, in vivo vs ex vivo
3. Table of leading gene therapy companies, modality, and pipeline focus
4. Approved gene therapies (Luxturna, Zolgensma, Casgevy, etc.)
5. Manufacturing challenges and solutions
6. Pricing and reimbursement landscape
7. Emerging platforms: lipid nanoparticles for gene therapy
8. Investment considerations
9. Conclusion

Target keywords: "gene therapy companies", "gene therapy stocks", "gene therapy landscape 2026".`;
    },
  },
  {
    slug: "biotech-market-cap-history-1t-to-7-5t",
    titleTemplate: "Biotech Market Cap: From $1T to $7.5T — A 35-Year History",
    category: "market-analysis",
    tags: ["market-cap", "biotech-history", "market-trends", "investment"],
    buildPrompt: async () => {
      const snapshots = await getMarketHistory();
      const sampled = snapshots.filter((_s, i) => i % Math.max(1, Math.floor(snapshots.length / 20)) === 0 || i === snapshots.length - 1);
      const dataPoints = sampled
        .map((s) => `| ${s.snapshot_date} | ${s.total_market_cap ? formatMarketCap(Number(s.total_market_cap)) : "N/A"} | ${s.total_companies_tracked || "N/A"} | ${s.public_companies_count || "N/A"} |`)
        .join("\n");
      return `Write a 2000-word article titled "Biotech Market Cap: From $1T to $7.5T — A 35-Year History".

Market snapshot data from our database:

| Date | Total Market Cap | Companies Tracked | Public Companies |
|------|-----------------|-------------------|------------------|
${dataPoints}

Structure:
1. Introduction: the meteoric rise of biotech
2. Table showing market cap growth over time
3. The 1990s: birth of the modern biotech industry
4. 2000s: the genomics revolution
5. 2010s: immunotherapy and precision medicine
6. 2020s: COVID catalysts and mRNA breakthroughs
7. Key inflection points that drove market cap growth
8. Which companies drove the most value creation
9. Outlook: where does biotech go from here
10. Conclusion

Target keywords: "biotech market cap", "biotech market history", "biotech industry growth".`;
    },
  },
  {
    slug: "orphan-drugs-rare-disease-biotech-companies",
    titleTemplate: "Orphan Drugs and Rare Disease Biotech Companies",
    category: "sector-reports",
    tags: ["rare-diseases", "orphan-drugs", "regulatory", "fda"],
    buildPrompt: async () => {
      const { companies } = await getCompaniesBySector("rare-diseases");
      const companyList = companies
        .slice(0, 25)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}`)
        .join("\n");
      return `Write a 2000-word article titled "Orphan Drugs and Rare Disease Biotech Companies".

Rare disease / orphan drug companies from our database:
${companyList}

Structure:
1. Introduction: why rare diseases are big business
2. The Orphan Drug Act and regulatory incentives
3. Table of leading rare disease companies
4. Market dynamics: premium pricing and small patient populations
5. Gene therapy's impact on rare disease treatment
6. Key therapeutic areas: lysosomal storage, neuromuscular, metabolic
7. Pipeline analysis: orphan drug candidates in development
8. Investment thesis for rare disease biotech
9. Conclusion

Target keywords: "orphan drug companies", "rare disease biotech", "orphan drug stocks".`;
    },
  },
  {
    slug: "digital-health-diagnostics-companies-leading-innovation",
    titleTemplate: "Digital Health and Diagnostics Companies Leading Innovation",
    category: "sector-reports",
    tags: ["diagnostics", "digital-health", "precision-medicine", "biotech-saas"],
    buildPrompt: async () => {
      const diag = await getCompaniesBySector("diagnostics");
      const dh = await getCompaniesBySector("digital-health");
      const all = [...(diag.companies || []), ...(dh.companies || [])];
      const seen = new Set<string>();
      const unique = all.filter((c) => {
        if (seen.has(c.slug)) return false;
        seen.add(c.slug);
        return true;
      });
      const companyList = unique
        .slice(0, 25)
        .map((c) => `- [${c.name}](/company/${c.slug}) — ${c.country || "N/A"} — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "Private"}`)
        .join("\n");
      return `Write a 2000-word article titled "Digital Health and Diagnostics Companies Leading Innovation".

Diagnostics & Digital Health companies from our database:
${companyList}

Structure:
1. Introduction: convergence of tech and healthcare
2. Diagnostics landscape: liquid biopsy, companion diagnostics, point-of-care
3. Table of leading diagnostics and digital health companies
4. AI-powered diagnostics and imaging
5. Digital therapeutics and remote patient monitoring
6. Biotech SaaS: tools powering drug development
7. Regulatory considerations for digital health
8. Market size and growth projections
9. Conclusion

Target keywords: "digital health companies", "diagnostics companies biotech", "precision medicine companies".`;
    },
  },
  {
    slug: "biotech-ipos-complete-guide-going-public",
    titleTemplate: "Biotech IPOs: Complete Guide to Going Public",
    category: "guides",
    tags: ["ipo", "public-markets", "sec", "biotech-investing", "stock-market"],
    buildPrompt: async () => {
      const topPublic = await getTopCompaniesByMarketCap(20);
      const companyList = topPublic
        .filter((c) => c.ticker)
        .slice(0, 15)
        .map((c) => `- [${c.name}](/company/${c.slug}) (${c.ticker}) — ${c.valuation ? formatMarketCap(Number(c.valuation)) : "N/A"}`)
        .join("\n");
      return `Write a 2000-word article titled "Biotech IPOs: Complete Guide to Going Public".

Top public biotech companies (for context on successful IPOs):
${companyList}

Structure:
1. Introduction: why biotech companies go public
2. The biotech IPO process: from S-1 filing to first trade
3. Key metrics investors look for in biotech IPOs
4. Table of notable biotech IPO success stories
5. The role of SEC EDGAR filings and what to look for
6. Timing the IPO: market windows and biotech cycles
7. Alternative paths: SPAC mergers, direct listings, reverse mergers
8. Post-IPO challenges for biotech companies
9. How to evaluate a biotech IPO as an investor
10. Conclusion

Target keywords: "biotech IPO", "biotech IPO guide", "how biotech companies go public".`;
    },
  },
];

/* ─── Main execution ─── */

async function main() {
  console.log("🧬 Blog Article Generator — Starting...\n");

  // Check if articles already exist
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("slug");
  const existingSlugs = new Set((existing || []).map((e: { slug: string }) => e.slug));

  let generated = 0;
  let skipped = 0;

  for (const article of articles) {
    if (existingSlugs.has(article.slug)) {
      console.log(`⏭️  Skipping "${article.titleTemplate}" (already exists)`);
      skipped++;
      continue;
    }

    console.log(`📝 Generating: "${article.titleTemplate}"...`);

    try {
      const prompt = await article.buildPrompt();
      const content = await callDeepSeek(prompt);

      // Extract first paragraph as excerpt
      const firstPara = content
        .split("\n\n")
        .find((p) => p.trim() && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("-"));
      const excerpt = firstPara
        ? firstPara.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 280)
        : "";

      const metaTitle = article.titleTemplate;
      const metaDescription = `${excerpt.slice(0, 155)}...`;

      const { error } = await supabase.from("blog_posts").insert({
        slug: article.slug,
        title: article.titleTemplate,
        content,
        excerpt,
        category: article.category,
        tags: article.tags,
        author: "BiotechTube Research",
        meta_title: metaTitle,
        meta_description: metaDescription,
        status: "published",
      });

      if (error) {
        console.error(`  ❌ Insert error for "${article.slug}":`, error.message);
      } else {
        console.log(`  ✅ Inserted "${article.titleTemplate}"`);
        generated++;
      }

      // Rate limit: wait between API calls
      await sleep(2000);
    } catch (err: any) {
      console.error(`  ❌ Error generating "${article.titleTemplate}":`, err.message);
    }
  }

  console.log(`\n✨ Done! Generated: ${generated}, Skipped: ${skipped}, Total: ${articles.length}`);
}

main().catch(console.error);
