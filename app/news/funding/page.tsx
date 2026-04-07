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
    .order("round_date", { ascending: false, nullsFirst: false })
    .limit(100);

  // Dashboard stats — use rolling windows so stats are never empty
  const now = new Date();
  const days30 = new Date(now); days30.setDate(days30.getDate() - 30);
  const days90 = new Date(now); days90.setDate(days90.getDate() - 90);
  const thisYear = `${now.getFullYear()}-01-01`;
  const days14 = new Date(now); days14.setDate(days14.getDate() - 14);
  const days30Str = days30.toISOString().split("T")[0];
  const days90Str = days90.toISOString().split("T")[0];
  const days14Str = days14.toISOString().split("T")[0];

  // Last 30 days funding
  const { data: monthRounds } = await supabase
    .from("funding_rounds")
    .select("amount_usd")
    .gte("announced_date", days30Str)
    .gt("amount_usd", 0)
    .neq("confidence", "filing_only");

  const monthTotal = (monthRounds || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);
  const monthCount = monthRounds?.length || 0;

  // Last 90 days
  const { data: quarterRounds } = await supabase
    .from("funding_rounds")
    .select("amount_usd")
    .gte("announced_date", days90Str)
    .gt("amount_usd", 0)
    .neq("confidence", "filing_only");

  const quarterTotal = (quarterRounds || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);

  // Year to date
  const { data: yearRounds } = await supabase
    .from("funding_rounds")
    .select("amount_usd")
    .gte("announced_date", thisYear)
    .gt("amount_usd", 0)
    .neq("confidence", "filing_only");

  const yearTotal = (yearRounds || []).reduce((s, r) => s + Number(r.amount_usd || 0), 0);

  // Largest round last 14 days
  const { data: weekLargest } = await supabase
    .from("funding_rounds")
    .select("company_name, amount_usd, round_type")
    .gte("announced_date", days14Str)
    .gt("amount_usd", 0)
    .order("amount_usd", { ascending: false })
    .limit(1);

  // Most active sectors last 30 days
  const { data: sectorActivity } = await supabase
    .from("funding_rounds")
    .select("sector")
    .gte("announced_date", days30Str)
    .gt("amount_usd", 0)
    .not("sector", "is", null);

  const sectorCounts = new Map<string, number>();
  for (const r of sectorActivity || []) {
    if (r.sector) sectorCounts.set(r.sector, (sectorCounts.get(r.sector) || 0) + 1);
  }
  const topSector = Array.from(sectorCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

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
