import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { ArticleEngine } from "@/lib/article-engine";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 270_000; // stop before 300s Vercel limit
const RATE_LIMIT_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: Request) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = createServerClient();
  const engine = new ArticleEngine();

  const results: Record<string, { attempted: number; generated: number; errors: string[] }> = {
    breaking_news: { attempted: 0, generated: 0, errors: [] },
    funding_deal: { attempted: 0, generated: 0, errors: [] },
  };

  // ── Pipeline 1: Breaking News from rss_items ──
  const { data: rssItems } = await (supabase.from as any)("rss_items")
    .select("id, title, url, source_name, summary, published_at, category, company_names")
    .eq("processed_for_article", false)
    .neq("category", "funding")
    .order("published_at", { ascending: false })
    .limit(3);

  if (rssItems && rssItems.length > 0) {
    for (const item of rssItems) {
      if (Date.now() - startTime > TIMEOUT_MS) break;

      results.breaking_news.attempted++;
      try {
        await engine.generateAndPublish({
          type: "breaking_news",
          source: { rss_item_id: item.id },
        });
        results.breaking_news.generated++;

        // Mark as processed
        await (supabase.from as any)("rss_items")
          .update({ processed_for_article: true })
          .eq("id", item.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.breaking_news.errors.push(`${item.id}: ${msg}`);
      }

      await sleep(RATE_LIMIT_MS);
    }
  }

  // ── Pipeline 2: Funding Deals ──
  if (Date.now() - startTime < TIMEOUT_MS) {
    const { data: fundingRounds } = await supabase
      .from("funding_rounds")
      .select("id, company_name, round_type, amount_usd, announced_date")
      .gte("amount_usd", 10_000_000)
      .neq("confidence", "filing_only")
      .order("announced_date", { ascending: false })
      .limit(10);

    if (fundingRounds && fundingRounds.length > 0) {
      let generated = 0;
      for (const round of fundingRounds) {
        if (Date.now() - startTime > TIMEOUT_MS) break;
        if (generated >= 3) break;

        // Check for existing article
        const isDuplicate = await engine.checkDuplicate("funding_round", round.id);
        if (isDuplicate) continue;

        results.funding_deal.attempted++;
        try {
          await engine.generateAndPublish({
            type: "funding_deal",
            source: { funding_round_id: round.id },
          });
          results.funding_deal.generated++;
          generated++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          results.funding_deal.errors.push(`${round.id}: ${msg}`);
        }

        await sleep(RATE_LIMIT_MS);
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  return NextResponse.json({
    ok: true,
    elapsed_seconds: elapsed,
    results,
  });
}
