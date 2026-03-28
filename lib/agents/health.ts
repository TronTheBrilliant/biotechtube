import { createServerClient } from "@/lib/supabase";

export interface AgentHealth {
  agent_id: string;
  score: number;
  summary: string;
  details: Record<string, unknown>;
}

function daysAgo(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export async function calculateHealth(agentId: string): Promise<AgentHealth> {
  const supabase = createServerClient();

  switch (agentId) {
    case "profiles": {
      const [totalRes, goodRes] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase
          .from("profile_quality")
          .select("*", { count: "exact", head: true })
          .gte("quality_score", 5),
      ]);
      const total = totalRes.count || 1;
      const good = goodRes.count || 0;
      const score = Math.round((good / total) * 100);
      return {
        agent_id: "profiles",
        score,
        summary: `${good.toLocaleString()} of ${total.toLocaleString()} profiles scored 5+`,
        details: { total, good },
      };
    }

    case "financial": {
      const { data } = await supabase
        .from("company_price_history")
        .select("date")
        .order("date", { ascending: false })
        .limit(1);
      const latestDate = data?.[0]?.date || null;
      const days = daysAgo(latestDate);
      const score =
        days <= 1 ? 95 : days <= 3 ? 75 : days <= 7 ? 50 : 20;
      return {
        agent_id: "financial",
        score,
        summary: latestDate
          ? `Prices ${days === 0 ? "updated today" : `${days}d old`}`
          : "No price data",
        details: { latest_date: latestDate, days_old: days },
      };
    }

    case "pipeline": {
      const [featuredRes, drugRes] = await Promise.all([
        supabase
          .from("featured_pipelines")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("drug_mentions")
          .select("*", { count: "exact", head: true }),
      ]);
      const total = (featuredRes.count || 0) + (drugRes.count || 0);
      const score = total > 100 ? 90 : total > 50 ? 70 : total > 20 ? 50 : 30;
      return {
        agent_id: "pipeline",
        score,
        summary: `${total} pipeline items tracked`,
        details: {
          featured: featuredRes.count || 0,
          drug_mentions: drugRes.count || 0,
        },
      };
    }

    case "content": {
      const [blogRes, newestRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        supabase
          .from("blog_posts")
          .select("published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(1),
      ]);
      const blogCount = blogRes.count || 0;
      const newestDate = newestRes.data?.[0]?.published_at?.split("T")[0] || null;
      const blogDays = daysAgo(newestDate);
      const freshness = blogDays <= 7 ? 40 : blogDays <= 14 ? 25 : 0;
      const volume = blogCount >= 20 ? 40 : blogCount >= 10 ? 25 : 10;
      const score = Math.min(100, freshness + volume + 20);
      return {
        agent_id: "content",
        score,
        summary: `${blogCount} articles${newestDate ? `, newest ${blogDays}d ago` : ""}`,
        details: { blog_count: blogCount, newest_date: newestDate },
      };
    }

    case "seo": {
      const [totalRes, seoRes] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase
          .from("company_seo")
          .select("*", { count: "exact", head: true })
          .not("meta_description", "is", null),
      ]);
      const total = totalRes.count || 1;
      const withSeo = seoRes.count || 0;
      const score = Math.round((withSeo / total) * 100);
      return {
        agent_id: "seo",
        score,
        summary: `${withSeo.toLocaleString()} of ${total.toLocaleString()} pages have meta descriptions`,
        details: { total, with_seo: withSeo },
      };
    }

    case "ux": {
      const { count } = await supabase
        .from("error_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      const openErrors = count || 0;
      const score = Math.max(0, 100 - openErrors * 10);
      return {
        agent_id: "ux",
        score,
        summary:
          openErrors === 0
            ? "No open error reports"
            : `${openErrors} open error report${openErrors > 1 ? "s" : ""}`,
        details: { open_errors: openErrors },
      };
    }

    default:
      return { agent_id: agentId, score: 0, summary: "Unknown agent", details: {} };
  }
}
