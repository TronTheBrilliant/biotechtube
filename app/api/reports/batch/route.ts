import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const REPORT_TTL_DAYS = 7;
const DEFAULT_LIMIT = 200;
const DELAY_BETWEEN_CALLS_MS = 2000;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Math.max(body.limit || DEFAULT_LIMIT, 1), 1000);

    const supabase = getSupabase();

    // 1. Fetch companies ordered by valuation DESC
    const { data: companies, error: compError } = await supabase
      .from("companies")
      .select("id, slug, name, valuation")
      .order("valuation", { ascending: false, nullsFirst: false })
      .limit(limit * 2);

    if (compError) {
      return NextResponse.json(
        { error: "Failed to fetch companies", details: compError.message },
        { status: 500 }
      );
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({ message: "No companies found", results: [] });
    }

    // 2. Fetch existing reports to find which ones need generation
    const { data: reports } = await supabase
      .from("company_reports")
      .select("report_slug, analyzed_at");

    const reportMap = new Map<string, { report_slug: string; analyzed_at: string | null }>();
    if (reports) {
      for (const r of reports) {
        reportMap.set(r.report_slug, r);
      }
    }

    const now = Date.now();
    const ttlMs = REPORT_TTL_DAYS * 24 * 60 * 60 * 1000;

    const needsReport = companies.filter((c) => {
      const existing = reportMap.get(c.slug);
      if (!existing) return true;
      if (!existing.analyzed_at) return true;
      const age = now - new Date(existing.analyzed_at).getTime();
      return age > ttlMs;
    }).slice(0, limit);

    if (needsReport.length === 0) {
      return NextResponse.json({
        message: "All top companies already have up-to-date reports",
        results: [],
        total_checked: companies.length,
      });
    }

    // 3. Generate reports sequentially by calling the generate endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const results: { slug: string; name: string; status: "generated" | "cached" | "failed"; error?: string }[] = [];

    for (let i = 0; i < needsReport.length; i++) {
      const company = needsReport[i];

      try {
        const res = await fetch(`${baseUrl}/api/reports/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: company.slug }),
          signal: AbortSignal.timeout(120000),
        });

        if (res.ok) {
          const data = await res.json();
          results.push({
            slug: company.slug,
            name: company.name,
            status: data.cached ? "cached" : "generated",
          });
        } else {
          const text = await res.text().catch(() => "Unknown error");
          results.push({
            slug: company.slug,
            name: company.name,
            status: "failed",
            error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
          });
        }
      } catch (err) {
        results.push({
          slug: company.slug,
          name: company.name,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Wait between calls to avoid rate limits (skip after last)
      if (i < needsReport.length - 1) {
        await sleep(DELAY_BETWEEN_CALLS_MS);
      }
    }

    const generated = results.filter((r) => r.status === "generated").length;
    const cached = results.filter((r) => r.status === "cached").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      message: `Batch complete: ${generated} generated, ${cached} cached, ${failed} failed`,
      total_queued: needsReport.length,
      generated,
      cached,
      failed,
      results,
    });
  } catch (err) {
    console.error("Batch report generation error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Batch generation failed", details: message },
      { status: 500 }
    );
  }
}
