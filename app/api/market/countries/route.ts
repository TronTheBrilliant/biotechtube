import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface CountryMarketData {
  country: string;
  snapshot_date: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  public_company_count: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Get the latest snapshot_date from country_market_data
    const { data: latestDateData, error: latestDateError } = await supabase
      .from("country_market_data")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    if (latestDateError) {
      console.error("Error fetching latest country snapshot date:", latestDateError);
      return NextResponse.json(
        { error: "Failed to fetch latest country snapshot date" },
        { status: 500 }
      );
    }

    const latestDate: string = latestDateData.snapshot_date;

    // Step 2: Fetch all country_market_data rows for that date
    const { data: countryData, error: countryError } = await supabase
      .from("country_market_data")
      .select(
        "country, snapshot_date, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct, public_company_count"
      )
      .eq("snapshot_date", latestDate);

    if (countryError) {
      console.error("Error fetching country_market_data:", countryError);
      return NextResponse.json(
        { error: "Failed to fetch country market data" },
        { status: 500 }
      );
    }

    // Step 3: Sort by combined_market_cap descending
    const countries = ((countryData ?? []) as CountryMarketData[])
      .map((row) => ({
        country: row.country,
        combined_market_cap: row.combined_market_cap,
        total_volume: row.total_volume,
        change_1d_pct: row.change_1d_pct,
        change_7d_pct: row.change_7d_pct,
        change_30d_pct: row.change_30d_pct,
        public_company_count: row.public_company_count,
      }))
      .sort((a, b) => (b.combined_market_cap ?? 0) - (a.combined_market_cap ?? 0));

    return NextResponse.json({ date: latestDate, countries });
  } catch (err) {
    console.error("Unexpected error in /api/market/countries:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
