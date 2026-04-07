import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { FundingNewsClient } from "./FundingNewsClient";

export const revalidate = 1800; // 30 min

export const metadata: Metadata = {
  title: "Biotech Funding News & Intelligence | BiotechTube",
  description: "Real-time biotech funding intelligence. AI-generated analysis of the latest funding rounds, investment trends, and deal flow across the global biotech industry.",
  openGraph: {
    title: "Biotech Funding Intelligence | BiotechTube",
    description: "Real-time analysis of biotech funding rounds and investment trends.",
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function FundingNewsPage() {
  const supabase = getSupabase();

  // Fetch articles
  const { data: articles } = await supabase
    .from("funding_articles")
    .select("id, slug, headline, subtitle, body, company_name, company_slug, round_type, amount_usd, lead_investor, round_date, sector, country, deal_size_category, article_type, is_featured, published_at")
    .order("published_at", { ascending: false })
    .limit(100);

  // Dashboard stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisQuarter = `${now.getFullYear()}-${String(Math.floor(now.getMonth() / 3) * 3 + 1).padStart(2, "0")}-01`;
  const thisYear = `${now.getFullYear()}-01-01`;
  const lastWeek = new Date(now); lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split("T")[0];

  // This month's funding
  const { data: monthRounds } = await supabase
    .from("funding_rounds")
    .select("amount_usd")
    .gte("announced_date", thisMonth)
    .gt("amount_usd", 0)
    .neq("confidence", "filing_only");

  const monthTotal = (monthRounds || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);
  const monthCount = monthRounds?.length || 0;

  // This quarter
  const { data: quarterRounds } = await supabase
    .from("funding_rounds")
    .select("amount_usd")
    .gte("announced_date", thisQuarter)
    .gt("amount_usd", 0)
    .neq("confidence", "filing_only");

  const quarterTotal = (quarterRounds || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);

  // This year
  const { data: yearRounds } = await supabase
    .from("funding_rounds")
    .select("amount_usd")
    .gte("announced_date", thisYear)
    .gt("amount_usd", 0)
    .neq("confidence", "filing_only");

  const yearTotal = (yearRounds || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);

  // Largest round this week
  const { data: weekLargest } = await supabase
    .from("funding_rounds")
    .select("company_name, amount_usd, round_type")
    .gte("announced_date", lastWeekStr)
    .gt("amount_usd", 0)
    .order("amount_usd", { ascending: false })
    .limit(1);

  // Most active sectors this month
  const { data: sectorActivity } = await supabase
    .from("funding_rounds")
    .select("sector")
    .gte("announced_date", thisMonth)
    .gt("amount_usd", 0)
    .not("sector", "is", null);

  const sectorCounts = new Map<string, number>();
  for (const r of sectorActivity || []) {
    if (r.sector) sectorCounts.set(r.sector, (sectorCounts.get(r.sector) || 0) + 1);
  }
  const topSector = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const dashboardStats = {
    monthTotal,
    monthCount,
    quarterTotal,
    yearTotal,
    largestThisWeek: weekLargest?.[0] || null,
    topSector,
  };

  return (
    <FundingNewsClient
      articles={articles || []}
      stats={dashboardStats}
    />
  );
}
