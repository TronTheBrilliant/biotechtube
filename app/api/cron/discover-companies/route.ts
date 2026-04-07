import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function extractDomain(url: string): string {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, ""); } catch { return ""; }
}

/**
 * Daily cron: Discover new biotech companies from a rotating set of sources.
 * Picks the least-recently-scraped source, scrapes it, creates + enriches new companies.
 * Stays within Vercel 300s timeout by limiting to 50 new companies per run.
 */
export async function GET() {
  const supabase = getSupabase();
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) return NextResponse.json({ ok: false, error: "No DEEPSEEK_API_KEY" });

  // Pick the source that was scraped least recently
  const { data: recentLogs } = await supabase
    .from("scrape_log")
    .select("source_id, scraped_at")
    .order("scraped_at", { ascending: false });

  // Simple source rotation — use ClinicalTrials.gov as it's the highest yield API source
  // This cron focuses on API-based sources that work reliably in a serverless context
  const apiSources = ["clinicaltrials-gov", "yc"];
  const lastScraped = new Map<string, string>();
  for (const log of recentLogs || []) {
    if (!lastScraped.has(log.source_id)) lastScraped.set(log.source_id, log.scraped_at);
  }

  // Pick least recently scraped
  let sourceId = apiSources[0];
  let oldestDate = new Date().toISOString();
  for (const s of apiSources) {
    const last = lastScraped.get(s);
    if (!last) { sourceId = s; break; } // Never scraped = highest priority
    if (last < oldestDate) { oldestDate = last; sourceId = s; }
  }

  const results = { source: sourceId, scraped: 0, new: 0, enriched: 0 };

  try {
    // Scrape based on source
    let companies: Array<{ name: string; website?: string | null; description?: string | null; source_url?: string | null }> = [];

    if (sourceId === "clinicaltrials-gov") {
      // Fetch recent trial sponsors
      const ctUrl = "https://clinicaltrials.gov/api/v2/studies?query.spons=INDUSTRY&filter.overallStatus=RECRUITING&fields=protocolSection.sponsorCollaboratorsModule&pageSize=100&sort=LastUpdatePostDate:desc";
      const res = await fetch(ctUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const sponsors = new Set<string>();
        for (const study of data.studies || []) {
          const lead = study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor;
          if (lead?.class === "INDUSTRY" && lead.name) {
            const name = lead.name.replace(/\s*\(.*?\)\s*/g, " ").replace(/,?\s*(Inc\.?|Corp\.?|Ltd\.?|LLC|PLC|AG|SA|GmbH)$/i, "").trim();
            if (name.length > 2 && !name.toLowerCase().includes("university") && !name.toLowerCase().includes("hospital")) {
              sponsors.add(name);
            }
          }
        }
        companies = Array.from(sponsors).map((name) => ({
          name,
          source_url: `https://clinicaltrials.gov/search?spons=${encodeURIComponent(name)}&sponsType=INDUSTRY`,
        }));
      }
    } else if (sourceId === "yc") {
      // YC Algolia API
      try {
        const ycRes = await fetch("https://45bwzj1sgc-dsn.algolia.net/1/indexes/*/queries", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Algolia-Application-Id": "45BWZJ1SGC", "X-Algolia-API-Key": "Zjk5ZmFjMzg2OGE5NmJhNzRlNDA1Y2I4MzA4MThjNDYzMmNlOGI0MDVjMDA1MWFjNzVlOWQ5YjI0ZGYyMzY4OGZkZGFhNGJjMTA3YjZlMmE0N2Y2NjU5ZDU1OTRhN2Q5NTI1ZmM5OGQ2ZjM3OTQwYzZmNDYyMjA0MTdlZTJiYQ==" },
          body: JSON.stringify({ requests: [{ indexName: "YCCompany_production", params: "query=&facetFilters=[[\"industry:Biotech\"]]&hitsPerPage=200" }] }),
          signal: AbortSignal.timeout(10000),
        });
        if (ycRes.ok) {
          const data = await ycRes.json();
          companies = (data.results?.[0]?.hits || []).map((h: { name: string; website?: string; one_liner?: string; slug?: string }) => ({
            name: h.name,
            website: h.website || null,
            description: h.one_liner || null,
            source_url: `https://www.ycombinator.com/companies/${h.slug || ""}`,
          }));
        }
      } catch { /* YC API might not work with this key */ }
    }

    results.scraped = companies.length;

    // Dedup against existing companies
    const newCompanies: typeof companies = [];
    for (const co of companies.slice(0, 100)) {
      const { data: existing } = await supabase.from("companies").select("id").ilike("name", co.name).limit(1);
      if (existing && existing.length > 0) continue;

      // Also check partial match
      const { data: partial } = await supabase.from("companies").select("id").ilike("name", `%${co.name}%`).limit(1);
      if (partial && partial.length > 0) continue;

      newCompanies.push(co);
      if (newCompanies.length >= 50) break; // Cap at 50 per run
    }

    // Create new companies
    const newIds: string[] = [];
    for (const co of newCompanies) {
      const slug = slugify(co.name);
      const { data: slugCheck } = await supabase.from("companies").select("id").eq("slug", slug).limit(1);
      const finalSlug = (slugCheck && slugCheck.length > 0) ? `${slug}-${Date.now() % 10000}` : slug;

      const domain = co.website ? extractDomain(co.website) : "";
      const { data: newCo, error } = await supabase.from("companies").insert({
        slug: finalSlug,
        name: co.name,
        country: "United States",
        website: co.website || null,
        domain: domain || null,
        description: co.description || null,
        logo_url: domain ? `https://img.logo.dev/${domain}?token=pk_mBbMEHj5R1qxyOb4VNLsAQ&size=64` : null,
        source: sourceId,
        source_url: co.source_url || null,
        categories: [],
        is_estimated: true,
      }).select("id").single();

      if (!error && newCo) {
        newIds.push(newCo.id);
        results.new++;
      }
    }

    // Enrich via DeepSeek
    if (newIds.length > 0) {
      const { data: toEnrich } = await supabase.from("companies").select("id, name").in("id", newIds.slice(0, 30));
      if (toEnrich && toEnrich.length > 0) {
        const names = toEnrich.map((c) => c.name).join("\n");
        try {
          const enrichRes = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                { role: "system", content: "Biotech company enrichment. Return JSON keyed by company name." },
                { role: "user", content: `For each company: description (1 sentence, max 30 words), categories (1-3: Oncology, Immunology, Neuroscience, Gene Therapy, etc.), country, city, founded (year).\n\nCompanies:\n${names}\n\nReturn: {"Company Name": {"description":"...", "categories":[...], "country":"...", "city":"...", "founded":2020}}` },
              ],
              temperature: 0, max_tokens: 3000,
            }),
          });
          if (enrichRes.ok) {
            const data = await enrichRes.json();
            let content = data.choices[0]?.message?.content || "";
            if (content.startsWith("```")) content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
            const parsed = JSON.parse(content);
            for (const co of toEnrich) {
              const d = parsed[co.name];
              if (!d) continue;
              const updates: Record<string, unknown> = {};
              if (d.description) updates.description = d.description;
              if (d.categories) updates.categories = d.categories;
              if (d.country) updates.country = d.country;
              if (d.city) updates.city = d.city;
              if (d.founded) updates.founded = d.founded;
              updates.enriched_at = new Date().toISOString();
              await supabase.from("companies").update(updates).eq("id", co.id);
              results.enriched++;
            }
          }
        } catch { /* best effort */ }
      }
    }

    // Log
    await supabase.from("scrape_log").insert({
      source_id: sourceId,
      companies_found: results.scraped,
      companies_new: results.new,
      companies_enriched: results.enriched,
    });

  } catch (err) {
    await supabase.from("scrape_log").insert({
      source_id: sourceId, companies_found: 0, companies_new: 0, companies_enriched: 0,
      error: (err as Error).message,
    });
  }

  return NextResponse.json({ ok: true, ...results });
}
