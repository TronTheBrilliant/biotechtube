import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface SectorMarketData {
  sector_id: string;
  snapshot_date: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  top_company_id: string | null;
}

interface SectorRow {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  description: string | null;
  company_count: number | null;
  public_company_count: number | null;
}

interface SectorResponse {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  company_count: number | null;
  public_company_count: number | null;
  top_company_id: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Get the latest snapshot_date from sector_market_data
    const { data: latestDateData, error: latestDateError } = await supabase
      .from("sector_market_data")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    if (latestDateError) {
      console.error("Error fetching latest sector snapshot date:", latestDateError);
      return NextResponse.json(
        { error: "Failed to fetch latest sector snapshot date" },
        { status: 500 }
      );
    }

    const latestDate: string = latestDateData.snapshot_date;

    // Step 2: Fetch all sector_market_data rows for that date
    const { data: sectorMarketData, error: sectorMarketError } = await supabase
      .from("sector_market_data")
      .select(
        "sector_id, snapshot_date, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, top_company_id"
      )
      .eq("snapshot_date", latestDate);

    if (sectorMarketError) {
      console.error("Error fetching sector_market_data:", sectorMarketError);
      return NextResponse.json(
        { error: "Failed to fetch sector market data" },
        { status: 500 }
      );
    }

    // Step 3: Fetch all sectors
    const { data: sectorsData, error: sectorsError } = await supabase
      .from("sectors")
      .select("id, name, slug, short_name, description, company_count, public_company_count");

    if (sectorsError) {
      console.error("Error fetching sectors:", sectorsError);
      return NextResponse.json(
        { error: "Failed to fetch sectors" },
        { status: 500 }
      );
    }

    // Step 4: Join in code
    const sectorsMap = new Map<string, SectorRow>();
    for (const sector of (sectorsData ?? []) as SectorRow[]) {
      sectorsMap.set(sector.id, sector);
    }

    const joined: SectorResponse[] = [];
    for (const marketRow of (sectorMarketData ?? []) as SectorMarketData[]) {
      const sector = sectorsMap.get(marketRow.sector_id);
      if (!sector) continue;

      joined.push({
        id: sector.id,
        name: sector.name,
        slug: sector.slug,
        short_name: sector.short_name ?? null,
        combined_market_cap: marketRow.combined_market_cap,
        total_volume: marketRow.total_volume,
        change_1d_pct: marketRow.change_1d_pct,
        change_7d_pct: marketRow.change_7d_pct,
        change_30d_pct: marketRow.change_30d_pct,
        company_count: sector.company_count ?? null,
        public_company_count: sector.public_company_count ?? null,
        top_company_id: marketRow.top_company_id,
      });
    }

    // Step 5: Sort by combined_market_cap descending
    joined.sort((a, b) => (b.combined_market_cap ?? 0) - (a.combined_market_cap ?? 0));

    return NextResponse.json({ date: latestDate, sectors: joined });
  } catch (err) {
    console.error("Unexpected error in /api/market/sectors:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
