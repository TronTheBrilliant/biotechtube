import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface MarketSnapshot {
  snapshot_date: string;
  total_market_cap: number | null;
  public_companies_count: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  change_ytd_pct: number | null;
  top_gainer_id: string | null;
  top_gainer_pct: number | null;
  top_loser_id: string | null;
  top_loser_pct: number | null;
}

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "365", 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const PAGE_SIZE = 1000;
    let allSnapshots: MarketSnapshot[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("market_snapshots")
        .select(
          "snapshot_date, total_market_cap, public_companies_count, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, change_ytd_pct, top_gainer_id, top_gainer_pct, top_loser_id, top_loser_pct"
        )
        .gte("snapshot_date", cutoffStr)
        .order("snapshot_date", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("Error fetching market_snapshots:", error);
        return NextResponse.json(
          { error: "Failed to fetch market snapshots" },
          { status: 500 }
        );
      }

      const page = (data ?? []) as MarketSnapshot[];
      allSnapshots = allSnapshots.concat(page);

      if (page.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }

    const latest = allSnapshots.length > 0 ? allSnapshots[0] : null;
    const history = allSnapshots.length > 1 ? allSnapshots.slice(1) : [];

    return NextResponse.json({ latest, history });
  } catch (err) {
    console.error("Unexpected error in /api/market/snapshot:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
