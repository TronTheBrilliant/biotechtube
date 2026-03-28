import { createServerClient } from "@/lib/supabase";
import { callAI, logFixes, type AgentFix } from "./framework";

function daysAgo(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export async function runContentAgent(
  runId: string,
  _batchSize: number,
  modelId: string | null
): Promise<{
  items_scanned: number;
  items_fixed: number;
  issues_found: number;
  summary: string;
  details?: Record<string, unknown>;
  model_used?: string;
}> {
  const supabase = createServerClient();
  const allFixes: AgentFix[] = [];
  let issuesFound = 0;
  const parts: string[] = [];

  // 1. Check news freshness
  const { data: latestNews } = await supabase
    .from("news_items")
    .select("published_date")
    .order("published_date", { ascending: false })
    .limit(1);

  const lastNewsDate = latestNews?.[0]?.published_date?.split("T")[0] || null;
  const newsDays = daysAgo(lastNewsDate);

  if (newsDays > 3) {
    issuesFound++;
    parts.push(`News is ${newsDays}d stale`);
    allFixes.push({
      entity_type: "news",
      entity_id: "freshness",
      field: "last_scraped",
      old_value: lastNewsDate,
      new_value: "needs_refresh",
      confidence: 1.0,
    });
  } else {
    parts.push("News is fresh");
  }

  // 2. Check if weekly recap exists for current week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: recentRecaps } = await supabase
    .from("blog_posts")
    .select("id, title, published_at")
    .ilike("title", "%weekly%recap%")
    .gte("published_at", weekStartStr)
    .limit(1);

  if (!recentRecaps || recentRecaps.length === 0) {
    issuesFound++;
    parts.push("No weekly recap this week");
  } else {
    parts.push("Weekly recap exists");
  }

  // 3. Check blog freshness
  const { data: latestBlog } = await supabase
    .from("blog_posts")
    .select("published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1);

  const lastBlogDate = latestBlog?.[0]?.published_at?.split("T")[0] || null;
  const blogDays = daysAgo(lastBlogDate);

  if (blogDays > 7) {
    issuesFound++;
    parts.push(`No new articles in ${blogDays}d`);
  }

  await logFixes(runId, allFixes);

  // Note: Content agent currently diagnoses issues. The scraping and recap
  // generation logic depends on existing scripts (scrape-biotech-news.ts,
  // generate-weekly-recap.ts). A future iteration should integrate those
  // scripts into this agent. For now, the agent identifies what needs attention.

  return {
    items_scanned: 3, // 3 freshness checks
    items_fixed: allFixes.length,
    issues_found: issuesFound,
    summary: parts.join(", "),
    details: {
      news_days_old: newsDays,
      blog_days_old: blogDays,
      has_weekly_recap: (recentRecaps?.length || 0) > 0,
    },
  };
}
