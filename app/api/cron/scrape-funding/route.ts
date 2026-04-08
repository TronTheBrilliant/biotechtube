import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ─── RSS Feeds ───
const RSS_FEEDS = [
  { name: "GlobeNewswire", url: "https://www.globenewswire.com/RssFeed/subjectcode/15-Pharmaceuticals+Biotechnology/feedTitle/GlobeNewswire+-+Pharmaceuticals+Biotechnology", source_name: "globenewswire" },
  { name: "PRNewswire", url: "https://www.prnewswire.com/rss/health-latest-news/health-latest-news-list.rss", source_name: "prnewswire" },
];

// ─── RSS Item Helpers ───

function categorizeBiotechNews(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase()
  if (/fda|approv|clear|reject|complete response|advisory committee/.test(text)) return 'fda'
  if (/rais|fund|series [a-e]|seed|ipo|financ|invest|venture|grant/.test(text)) return 'funding'
  if (/partner|collaborat|licens|agreement|alliance/.test(text)) return 'partnership'
  if (/acqui|merg|buyout|takeover/.test(text)) return 'acquisition'
  if (/trial|phase [1-3]|endpoint|efficacy|safety data|readout|clinical/.test(text)) return 'trial'
  return 'general'
}

function extractCompanyNames(title: string, description?: string): string[] {
  const text = `${title} ${description || ''}`
  const matches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|Ltd|Therapeutics|Pharma|Bio|Sciences|Biosciences|Oncology|Genomics)\.?)?/g)
  if (!matches) return []
  const skipWords = new Set(['The', 'This', 'That', 'These', 'Those', 'FDA', 'SEC', 'NYSE', 'NASDAQ', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'])
  return [...new Set(matches)]
    .filter(m => !skipWords.has(m) && m.length > 3)
    .slice(0, 5)
}

const FUNDING_KEYWORDS = [
  "raises", "raised", "funding", "series a", "series b", "series c",
  "seed round", "seed funding", "investment", "million", "financing",
  "capital raise", "ipo", "public offering", "pipe", "private placement",
  "grant", "venture", "closes", "closed", "secures", "secured",
];

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

interface RSSItem {
  title: string; link: string; description: string; pubDate: string; source: string;
}

async function fetchRSS(feed: typeof RSS_FEEDS[0]): Promise<RSSItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "BiotechTube (research@biotechtube.io)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: RSSItem[] = [];
    const matches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const m of matches.slice(0, 30)) {
      const title = m.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
      const link = m.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
      const desc = m.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim().substring(0, 400) || "";
      const pubDate = m.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";
      if (title) items.push({ title, link, description: desc, pubDate, source: feed.source_name });
    }
    return items;
  } catch { return []; }
}

async function extractWithAI(articles: RSSItem[]): Promise<Array<{ company_name: string; round_type: string; amount_usd: number; lead_investor: string; date: string; source_url: string; source_name: string }>> {
  if (!articles.length || !process.env.DEEPSEEK_API_KEY) return [];
  const texts = articles.map((a, i) => `[${i + 1}] "${a.title}" — ${a.description.substring(0, 200)}`).join("\n\n");
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: `Extract biotech funding rounds from news. Return JSON array: [{"article_index":1,"company_name":"X","round_type":"Series A","amount_millions_usd":50,"lead_investor":"Y","date":"YYYY-MM-DD"}]. Only clear funding announcements. No markdown.` },
          { role: "user", content: `Extract funding rounds:\n\n${texts}\n\nToday: ${new Date().toISOString().split("T")[0]}` }
        ],
        temperature: 0, max_tokens: 1500,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    let content = data.choices[0]?.message?.content || "[]";
    if (content.startsWith("```")) content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    const rounds = JSON.parse(content);
    if (!Array.isArray(rounds)) return [];
    return rounds.filter((r: { company_name: string }) => r.company_name).map((r: { article_index: number; company_name: string; round_type: string; amount_millions_usd: number; lead_investor: string; date: string }) => ({
      company_name: r.company_name,
      round_type: r.round_type || "Venture",
      amount_usd: (r.amount_millions_usd || 0) * 1_000_000,
      lead_investor: r.lead_investor || "Undisclosed",
      date: r.date || new Date().toISOString().split("T")[0],
      source_url: articles[(r.article_index || 1) - 1]?.link || "",
      source_name: articles[(r.article_index || 1) - 1]?.source || "news",
    }));
  } catch { return []; }
}

export async function GET() {
  const supabase = getSupabase();
  const results = { feeds: 0, articles: 0, funding: 0, extracted: 0, inserted: 0, duplicates: 0, noMatch: 0 };

  // 1. Fetch RSS
  let allItems: RSSItem[] = [];
  for (const feed of RSS_FEEDS) {
    const items = await fetchRSS(feed);
    results.feeds++;
    allItems.push(...items);
  }
  results.articles = allItems.length;

  // 2. Store ALL RSS items in rss_items table for breaking news pipeline
  if (allItems.length > 0) {
    const rssRows = allItems.map((item) => ({
      title: item.title,
      url: item.link,
      source_name: item.source,
      summary: item.description?.substring(0, 500) || null,
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      category: categorizeBiotechNews(item.title, item.description),
      company_names: extractCompanyNames(item.title, item.description),
    }));

    const { error: rssError } = await (supabase.from as any)('rss_items')
      .upsert(rssRows, { onConflict: 'url', ignoreDuplicates: true });

    if (rssError) {
      console.error('Failed to upsert rss_items:', rssError.message);
    } else {
      (results as Record<string, number>).rssItemsStored = rssRows.length;
    }
  }

  // 3. Filter funding
  const fundingArticles = allItems.filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return FUNDING_KEYWORDS.some((kw) => text.includes(kw));
  });
  results.funding = fundingArticles.length;

  if (fundingArticles.length === 0) {
    return NextResponse.json({ ok: true, ...results, message: "No funding articles found" });
  }

  // 4. Extract with AI
  const rounds = await extractWithAI(fundingArticles);
  results.extracted = rounds.length;

  // 5. Match and insert (auto-create companies if not found)
  const newCompanyIds: string[] = [];

  for (const round of rounds) {
    // Match company — try exact, then partial
    let companyId: string | null = null;
    const { data: match } = await supabase.from("companies").select("id").ilike("name", round.company_name).limit(1).single();
    if (match) {
      companyId = match.id;
    } else if (round.company_name.length >= 5) {
      // Only do partial matching for names >= 5 chars to avoid false positives
      const { data: partial } = await supabase.from("companies").select("id, name").ilike("name", `%${round.company_name}%`).limit(5);
      // Pick the best match — shortest name wins (closest to exact match)
      const best = partial?.sort((a, b) => a.name.length - b.name.length)[0];
      if (best) {
        companyId = best.id;
      }
    }
    if (!companyId) {
      // Auto-create the company instead of skipping
      const slug = round.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      const { data: slugCheck } = await supabase.from("companies").select("id").eq("slug", slug).limit(1);
      const finalSlug = (slugCheck && slugCheck.length > 0) ? `${slug}-${Date.now() % 10000}` : slug;

      const { data: newCo, error: createErr } = await supabase.from("companies").insert({
        slug: finalSlug,
        name: round.company_name,
        country: "United States",
        source: "news_scrape",
        source_url: round.source_url || null,
        is_estimated: true,
        categories: [],
      }).select("id").single();

      if (!createErr && newCo) {
        companyId = newCo.id;
        newCompanyIds.push(newCo.id);
        (results as Record<string, number>).companiesCreated = ((results as Record<string, number>).companiesCreated || 0) + 1;
      } else {
        results.noMatch++;
        continue;
      }
    }

    if (!companyId) { results.noMatch++; continue; }

    // Dedup: same company + round type within 30 days
    const dateObj = new Date(round.date);
    const dateMin = new Date(dateObj); dateMin.setDate(dateMin.getDate() - 30);
    const dateMax = new Date(dateObj); dateMax.setDate(dateMax.getDate() + 30);
    const { data: existing } = await supabase.from("funding_rounds").select("id")
      .eq("company_id", companyId).eq("round_type", round.round_type)
      .gte("announced_date", dateMin.toISOString().split("T")[0])
      .lte("announced_date", dateMax.toISOString().split("T")[0]).limit(1);

    if (existing && existing.length > 0) { results.duplicates++; continue; }

    // Insert
    const { error } = await supabase.from("funding_rounds").insert({
      company_id: companyId,
      company_name: round.company_name,
      round_type: round.round_type,
      amount_usd: round.amount_usd > 0 ? round.amount_usd : null,
      announced_date: round.date,
      lead_investor: round.lead_investor,
      source_name: round.source_name,
      source_url: round.source_url,
      confidence: "scraped",
    });

    if (!error) results.inserted++;
  }

  // 6. Enrich newly created companies via DeepSeek (basic fields)
  if (newCompanyIds.length > 0 && process.env.DEEPSEEK_API_KEY) {
    const companyList = newCompanyIds.length <= 10 ? newCompanyIds : newCompanyIds.slice(0, 10);
    const { data: newCos } = await supabase.from("companies").select("id, name").in("id", companyList);
    if (newCos && newCos.length > 0) {
      const names = newCos.map((c) => c.name).join("\n");
      try {
        const enrichRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: "Biotech company data enrichment. Return JSON keyed by company name." },
              { role: "user", content: `For each biotech company, provide: description (1 sentence, max 30 words), categories (1-3 from: Oncology, Immunology, Neuroscience, Gene Therapy, Cell Therapy, etc.), country, city, founded (year).\n\nCompanies:\n${names}\n\nReturn JSON: {"Company Name": {"description":"...", "categories":[...], "country":"...", "city":"...", "founded":2020}}` },
            ],
            temperature: 0, max_tokens: 2000,
          }),
        });
        if (enrichRes.ok) {
          const enrichData = await enrichRes.json();
          let content = enrichData.choices[0]?.message?.content || "";
          if (content.startsWith("```")) content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
          const parsed = JSON.parse(content);
          for (const co of newCos) {
            const data = parsed[co.name];
            if (!data) continue;
            const updates: Record<string, unknown> = {};
            if (data.description) updates.description = data.description;
            if (data.categories) updates.categories = data.categories;
            if (data.country) updates.country = data.country;
            if (data.city) updates.city = data.city;
            if (data.founded) updates.founded = data.founded;
            updates.enriched_at = new Date().toISOString();
            await supabase.from("companies").update(updates).eq("id", co.id);
          }
          (results as Record<string, number>).companiesEnriched = newCos.length;
        }
      } catch { /* enrichment is best-effort */ }
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
