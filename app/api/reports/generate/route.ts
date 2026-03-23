import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const REPORT_TTL_DAYS = 7;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: key });
}

function getDeepSeek() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: key,
  });
}

// Generate report text using DeepSeek (cheap) or Anthropic (premium)
async function generateWithAI(prompt: string): Promise<string> {
  const deepseek = getDeepSeek();

  if (deepseek) {
    // Use DeepSeek V3 — ~100x cheaper than Sonnet
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
      temperature: 0.3,
    });
    return completion.choices[0]?.message?.content || "";
  }

  // Fallback to Anthropic
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

// Extract text from HTML
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Extract internal links from HTML
function extractLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith("/") || href.startsWith(baseUrl)) {
      links.push(href.startsWith("/") ? `${baseUrl}${href}` : href);
    }
  }
  return Array.from(new Set(links));
}

// Find relevant subpages (team, about, pipeline, leadership, science)
function findRelevantPages(links: string[]): string[] {
  const keywords = [
    /about/i, /team/i, /leadership/i, /management/i, /people/i,
    /pipeline/i, /science/i, /research/i, /programs/i, /clinical/i,
    /therapeutic/i, /technology/i, /platform/i, /investors/i,
    /who-we-are/i, /our-team/i, /our-science/i, /our-pipeline/i,
    /board/i, /executives/i, /company/i,
  ];

  return links.filter(url =>
    keywords.some(kw => kw.test(url))
  ).slice(0, 5); // Max 5 subpages
}

// Scrape a single URL
async function scrapePage(url: string, maxChars: number = 6000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BiotechTubeBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return htmlToText(html).slice(0, maxChars);
  } catch {
    return "";
  }
}

// Scrape company website + relevant subpages
async function scrapeCompanyWebsite(website: string): Promise<{ content: string; pagesScraped: string[] }> {
  if (!website) return { content: "", pagesScraped: [] };

  const baseUrl = website.startsWith("http") ? website : `https://${website}`;
  const cleanBase = baseUrl.replace(/\/$/, "");
  const pagesScraped: string[] = [cleanBase];

  try {
    // 1. Fetch homepage HTML
    const res = await fetch(cleanBase, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BiotechTubeBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { content: "", pagesScraped: [] };

    const html = await res.text();
    const homepageText = htmlToText(html).slice(0, 6000);

    // 2. Find relevant subpages
    const links = extractLinks(html, cleanBase);
    const relevantPages = findRelevantPages(links);

    // 3. Scrape subpages in parallel
    const subpageResults = await Promise.all(
      relevantPages.map(async (url) => {
        const text = await scrapePage(url, 4000);
        if (text.length > 100) {
          pagesScraped.push(url);
          return `\n\n--- PAGE: ${url} ---\n${text}`;
        }
        return "";
      })
    );

    const allContent = `--- HOMEPAGE ---\n${homepageText}${subpageResults.join("")}`;

    // Cap total at 20000 chars
    return {
      content: allContent.slice(0, 20000),
      pagesScraped
    };
  } catch {
    return { content: "", pagesScraped: [] };
  }
}

// Build the prompt for Claude
function buildReportPrompt(
  companyName: string,
  slug: string,
  existingData: Record<string, unknown>,
  websiteContent: string
): string {
  return `You are an expert biotech/pharma analyst creating a comprehensive company intelligence report for "${companyName}".

## Existing Database Record
${JSON.stringify(existingData, null, 2)}

## Scraped Website Content
${websiteContent || "No website content available."}

## Your Task
Generate the MOST COMPREHENSIVE report possible. Extract EVERY piece of information from the website content. This is critical:

### TEAM/LEADERSHIP: Extract ALL named people you can find
- Look for executive teams, board of directors, scientific advisory board, management team
- Extract at least 5-15 people if available on the website
- For each person include their full name and exact title/role
- Look for C-suite (CEO, CFO, COO, CSO, CMO, CTO), VPs, Directors, Board members

### PIPELINE/PROGRAMS: Extract ALL drug programs/products
- Look for drug names, candidate names, product names
- Include indication (disease/condition being treated)
- Include development phase (Pre-clinical, Phase 1, Phase 1/2, Phase 2, Phase 3, Approved/Commercial)
- Include clinical trial IDs (NCT numbers) if mentioned
- For large pharma, include their most important/known drugs even if from general knowledge

### FUNDING: Extract ALL funding information
- Look for IPO, funding rounds, grants, partnerships with financial terms
- Include total amount raised if mentioned

### DESCRIPTION: Write a compelling 2-3 sentence description suitable for display at the top of the company profile

Return a JSON object with these exact fields:

{
  "description": "A clear, factual 2-3 sentence description of what the company does, their key products/technology, and their current position in the market. This will be displayed prominently on the profile.",
  "summary": "A slightly longer 3-4 sentence executive summary covering the company's mission, key achievements, and strategic direction.",
  "deep_report": "A comprehensive markdown report (1000-2000 words) with these sections:\n## Company Overview\n## Technology Platform\n## Pipeline & Programs\n(table format with columns: Program | Indication | Phase | Status)\n## Market Opportunity\n## Competitive Landscape\n## Leadership & Team\n## Financial Position\n## Key Risks\n## Outlook\nUse ## headings, bullet points, tables, and clear structure.",
  "founded": year as number or null,
  "headquarters_city": "city" or null,
  "headquarters_country": "country" or null,
  "employee_estimate": "e.g. 10,000-15,000" or null,
  "business_model": "Therapeutics" or "Platform" or "Services" or "Diagnostics" or null,
  "revenue_status": "Pre-revenue" or "Early Revenue" or "Revenue Generating" or null,
  "stage": "Pre-clinical" or "Phase 1" or "Phase 2" or "Phase 3" or "Approved" or "Commercial" or null,
  "company_type": "Public" or "Private" or null,
  "ticker": "stock ticker symbol" or null,
  "exchange": "NYSE" or "NASDAQ" or "OSE" etc or null,
  "therapeutic_areas": ["area1", "area2", ...] or null,
  "technology_platform": "Description of core technology/platform in 1-2 sentences" or null,
  "pipeline_programs": [
    {"name": "Drug/Product name", "indication": "Disease/condition", "phase": "Phase X", "status": "Active", "trial_id": "NCT..." or null},
    ... include ALL programs you can identify
  ] or null,
  "key_people": [
    {"name": "Full Name", "role": "Exact Title"},
    ... include ALL people you can identify (aim for 5-15+)
  ] or null,
  "contact_email": "email" or null,
  "contact_phone": "phone" or null,
  "contact_address": "full address" or null,
  "funding_mentions": ["Description of each funding event"] or null,
  "total_raised_estimate": number in USD or null,
  "investors": ["Investor/shareholder names"] or null,
  "partners": ["Partner/collaborator names"] or null,
  "opportunities": "2-3 sentences about growth opportunities" or null,
  "risks": "2-3 sentences about key risks and challenges" or null,
  "competitive_landscape": "2-3 sentences about main competitors and differentiation" or null
}

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown fences, no comments, no extra text
2. For pipeline_programs, include EVERY drug/product you can identify — err on the side of including more
3. For key_people, include EVERY named person with a title — aim for completeness
4. The "description" field is the most important — it's the first thing users see
5. Use your knowledge about well-known biotech/pharma companies to supplement website data
6. The deep_report should use markdown tables for pipeline data`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Check for existing cached report (less than 7 days old)
    // Use order + limit + maybeSingle to handle duplicate rows gracefully
    const { data: existingReport } = await supabase
      .from("company_reports")
      .select("*")
      .eq("report_slug", slug)
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReport) {
      const analyzedAt = existingReport.analyzed_at
        ? new Date(existingReport.analyzed_at)
        : null;
      const isExpired =
        !analyzedAt ||
        Date.now() - analyzedAt.getTime() > REPORT_TTL_DAYS * 24 * 60 * 60 * 1000;

      if (!isExpired) {
        return NextResponse.json({
          report: existingReport,
          cached: true,
        });
      }
    }

    // 2. Get company data from companies table
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 3. Scrape company website + subpages for context
    const { content: websiteContent, pagesScraped } = await scrapeCompanyWebsite(company.website || "");

    // 4. Generate report via AI (DeepSeek if available, otherwise Anthropic)
    const existingData = {
      name: company.name,
      country: company.country,
      city: company.city,
      founded: company.founded,
      stage: company.stage,
      type: company.type,
      ticker: company.ticker,
      focus: company.focus,
      employees: company.employees,
      totalRaised: company.total_raised,
      valuation: company.valuation,
      description: company.description,
      website: company.website,
      exchange: company.exchange,
    };

    const prompt = buildReportPrompt(
      company.name,
      slug,
      existingData,
      websiteContent
    );

    const responseText = await generateWithAI(prompt);

    // Parse the JSON response
    let reportData;
    try {
      reportData = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from markdown code fences
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to find JSON object boundaries
        const start = responseText.indexOf("{");
        const end = responseText.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          reportData = JSON.parse(responseText.slice(start, end + 1));
        } else {
          throw new Error("Failed to parse Claude response as JSON");
        }
      }
    }

    // 5. Upsert into company_reports table
    const now = new Date().toISOString();
    const reportRow = {
      company_id: company.id,
      report_slug: slug,
      summary: reportData.summary || null,
      deep_report: reportData.deep_report || null,
      founded: reportData.founded || null,
      headquarters_city: reportData.headquarters_city || null,
      headquarters_country: reportData.headquarters_country || null,
      employee_estimate: reportData.employee_estimate || null,
      business_model: reportData.business_model || null,
      revenue_status: reportData.revenue_status || null,
      stage: reportData.stage || null,
      company_type: reportData.company_type || null,
      ticker: reportData.ticker || null,
      exchange: reportData.exchange || null,
      therapeutic_areas: reportData.therapeutic_areas || null,
      technology_platform: reportData.technology_platform || null,
      pipeline_programs: reportData.pipeline_programs || null,
      key_people: reportData.key_people || null,
      contact_email: reportData.contact_email || null,
      contact_phone: reportData.contact_phone || null,
      contact_address: reportData.contact_address || null,
      funding_mentions: reportData.funding_mentions || null,
      total_raised_estimate: reportData.total_raised_estimate || null,
      investors: reportData.investors || null,
      partners: reportData.partners || null,
      opportunities: reportData.opportunities || null,
      risks: reportData.risks || null,
      competitive_landscape: reportData.competitive_landscape || null,
      pages_scraped: pagesScraped.length > 0 ? pagesScraped : null,
      scraped_at: now,
      analyzed_at: now,
    };

    // Delete ALL existing rows for this slug first (cleans up duplicates),
    // then insert one fresh row. This is safer than upsert which needs a unique constraint.
    await supabase
      .from("company_reports")
      .delete()
      .eq("report_slug", slug);

    await supabase.from("company_reports").insert(reportRow);

    // 6. Write enriched data back to companies table
    const companyUpdate: Record<string, unknown> = {};

    // Update description if we generated one and company has none
    if (reportData.description && !company.description) {
      companyUpdate.description = reportData.description;
    }

    // Update other fields if they're missing in the company record
    if (reportData.founded && (!company.founded || company.founded === 0)) {
      companyUpdate.founded = reportData.founded;
    }
    if (reportData.headquarters_city && !company.city) {
      companyUpdate.city = reportData.headquarters_city;
    }
    if (reportData.headquarters_country && !company.country) {
      companyUpdate.country = reportData.headquarters_country;
    }
    if (reportData.employee_estimate && (!company.employees || company.employees === "0")) {
      companyUpdate.employees = reportData.employee_estimate;
    }

    if (Object.keys(companyUpdate).length > 0) {
      await supabase
        .from("companies")
        .update(companyUpdate)
        .eq("slug", slug);
    }

    // Fetch the final report to return
    const { data: finalReport } = await supabase
      .from("company_reports")
      .select("*")
      .eq("report_slug", slug)
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      report: finalReport,
      cached: false,
      generated: true,
      companyUpdate: Object.keys(companyUpdate).length > 0 ? companyUpdate : null,
    });
  } catch (err) {
    console.error("Report generation error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate report", details: message },
      { status: 500 }
    );
  }
}
