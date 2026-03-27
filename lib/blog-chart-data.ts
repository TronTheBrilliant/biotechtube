import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface ChartPoint {
  time: string;
  value: number;
}

export interface ChartPlaceholder {
  type: "market-index" | "funding" | "company" | "sector";
  slug?: string;
  placeholder: string;
  title: string;
}

export function extractChartPlaceholders(content: string): ChartPlaceholder[] {
  const regex = /\[chart:(market-index|funding|company:([\w-]+)|sector:([\w-]+))\]/g;
  const charts: ChartPlaceholder[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const full = match[1];
    if (full.startsWith("company:")) {
      const slug = full.replace("company:", "");
      charts.push({ type: "company", slug, placeholder: match[0], title: slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) + " Stock Price" });
    } else if (full.startsWith("sector:")) {
      const slug = full.replace("sector:", "");
      charts.push({ type: "sector", slug, placeholder: match[0], title: slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) + " Market Cap" });
    } else if (full === "market-index") {
      charts.push({ type: "market-index", placeholder: match[0], title: "Biotech Market Index" });
    } else if (full === "funding") {
      charts.push({ type: "funding", placeholder: match[0], title: "Biotech VC Funding by Year" });
    }
  }
  return charts;
}

export async function fetchChartData(chart: ChartPlaceholder): Promise<ChartPoint[]> {
  const supabase = getSupabase();

  switch (chart.type) {
    case "market-index": {
      const allRows: any[] = [];
      let offset = 0;
      while (offset < 10000) {
        const { data } = await supabase
          .from("market_snapshots")
          .select("snapshot_date, total_market_cap")
          .order("snapshot_date", { ascending: true })
          .range(offset, offset + 999);
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      // Thin to ~500 points
      const step = Math.max(1, Math.floor(allRows.length / 500));
      return allRows
        .filter((_: any, i: number) => i % step === 0 || i === allRows.length - 1)
        .map((r: any) => ({ time: r.snapshot_date, value: Number(r.total_market_cap) }));
    }

    case "funding": {
      const { data } = await supabase.rpc("get_funding_annual" as never);
      if (data && Array.isArray(data)) {
        return (data as any[]).map((r: any) => ({ time: `${r.year}-07-01`, value: Number(r.total) }));
      }
      return [];
    }

    case "company": {
      if (!chart.slug) return [];
      const { data: company } = await supabase
        .from("companies")
        .select("id, name, ticker")
        .eq("slug", chart.slug)
        .single();
      if (!company) return [];

      // Update title with real name
      if (company.ticker) chart.title = `${company.name} (${company.ticker}) Stock Price`;
      else chart.title = `${company.name} Stock Price`;

      const allRows: any[] = [];
      let offset = 0;
      while (offset < 10000) {
        const { data } = await supabase
          .from("company_price_history")
          .select("date, adj_close")
          .eq("company_id", company.id)
          .not("adj_close", "is", null)
          .order("date", { ascending: true })
          .range(offset, offset + 999);
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      const step = Math.max(1, Math.floor(allRows.length / 500));
      return allRows
        .filter((_: any, i: number) => i % step === 0 || i === allRows.length - 1)
        .map((r: any) => ({ time: r.date, value: Number(r.adj_close) }));
    }

    case "sector": {
      if (!chart.slug) return [];
      const sectorName = chart.slug.replace(/-/g, " ");
      const allRows: any[] = [];
      let offset = 0;
      while (offset < 10000) {
        const { data } = await supabase
          .from("sector_market_data")
          .select("snapshot_date, combined_market_cap, sector_name")
          .ilike("sector_name", `%${sectorName}%`)
          .order("snapshot_date", { ascending: true })
          .range(offset, offset + 999);
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      if (allRows.length > 0 && allRows[0].sector_name) {
        chart.title = `${allRows[0].sector_name} Market Cap`;
      }
      const step = Math.max(1, Math.floor(allRows.length / 500));
      return allRows
        .filter((_: any, i: number) => i % step === 0 || i === allRows.length - 1)
        .map((r: any) => ({ time: r.snapshot_date, value: Number(r.combined_market_cap) }));
    }

    default:
      return [];
  }
}
