import { createClient } from "@supabase/supabase-js";
import SectorsPageClient from "./SectorsPageClient";

export const revalidate = 3600; // 1 hour (was 5 min)

export interface SectorWithMarketData {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  company_count: number | null;
  public_company_count: number | null;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
}

interface SectorRow {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  company_count: number | null;
  public_company_count: number | null;
}

interface SectorMarketRow {
  sector_id: string;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
}

export default async function SectorsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get latest snapshot date for sector market data
  const { data: latestDateRow } = await supabase
    .from("sector_market_data")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  let sectors: SectorWithMarketData[] = [];

  if (latestDateRow) {
    const [sectorMarketResult, sectorResult] = await Promise.all([
      supabase
        .from("sector_market_data")
        .select(
          "sector_id, combined_market_cap, total_volume, change_1d_pct, change_7d_pct, change_30d_pct"
        )
        .eq("snapshot_date", latestDateRow.snapshot_date)
        .then((r) => (r.data ?? []) as SectorMarketRow[]),
      supabase
        .from("sectors")
        .select(
          "id, slug, name, short_name, description, company_count, public_company_count"
        )
        .then((r) => (r.data ?? []) as SectorRow[]),
    ]);

    const sectorMap = new Map<string, SectorRow>();
    for (const s of sectorResult) sectorMap.set(s.id, s);

    sectors = sectorMarketResult
      .map((m) => {
        const s = sectorMap.get(m.sector_id);
        if (!s) return null;
        return {
          id: s.id,
          slug: s.slug,
          name: s.name,
          short_name: s.short_name,
          description: s.description,
          company_count: s.company_count,
          public_company_count: s.public_company_count,
          combined_market_cap: m.combined_market_cap,
          total_volume: m.total_volume,
          change_1d_pct: m.change_1d_pct,
          change_7d_pct: m.change_7d_pct,
          change_30d_pct: m.change_30d_pct,
        };
      })
      .filter(Boolean) as SectorWithMarketData[];

    sectors.sort(
      (a, b) => (b.combined_market_cap ?? 0) - (a.combined_market_cap ?? 0)
    );
  } else {
    // No market data — still show sectors
    const { data: sectorRows } = await supabase
      .from("sectors")
      .select(
        "id, slug, name, short_name, description, company_count, public_company_count"
      );

    sectors = ((sectorRows ?? []) as SectorRow[]).map((s) => ({
      ...s,
      combined_market_cap: null,
      total_volume: null,
      change_1d_pct: null,
      change_7d_pct: null,
      change_30d_pct: null,
    }));
  }

  return <SectorsPageClient sectors={sectors} />;
}
