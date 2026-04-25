// biotechtube/lib/reports/models/comparables.ts
import { createServerClient } from "@/lib/supabase";
import type { ComparablePeer } from "../types";

export async function computeComparables(company: any): Promise<ComparablePeer[]> {
  const supabase = createServerClient();
  // company.sector may not exist in the DB schema (schema assumption from spec).
  // Fall back to company.categories[0] if present, otherwise return empty.
  const sectorKey: string | null = company?.sector ?? company?.categories?.[0] ?? null;
  if (!sectorKey) return [];

  // Use select("*") cast to any to handle columns that may not exist in generated types.
  const { data: peersRaw } = await (supabase
    .from("companies")
    .select("*") as any)
    .eq("sector", sectorKey)
    .neq("id", company.id)
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(20);
  const peers: any[] = peersRaw ?? [];
  if (peers.length === 0) return [];

  const top5 = peers.slice(0, 5);

  const ids = top5.map((p: any) => p.id);
  const { data: pipes } = await supabase
    .from("pipelines")
    .select("company_id")
    .in("company_id", ids);
  const depthByCo: Record<string, number> = {};
  for (const r of pipes ?? []) depthByCo[r.company_id as string] = (depthByCo[r.company_id as string] ?? 0) + 1;

  const result: ComparablePeer[] = top5.map((p: any) => ({
    company_name: p.name,
    market_cap_usd: typeof p.valuation === "number" ? p.valuation : null,
    pipeline_depth: depthByCo[p.id] ?? 0,
    cash_runway_months: null,
    leadership_avg_tenure_years: null,
    outlier_flags: [],
  }));

  const caps = result.map(r => r.market_cap_usd ?? 0);
  const depths = result.map(r => r.pipeline_depth);
  const maxCap = Math.max(...caps);
  const minCap = Math.min(...caps.filter(c => c > 0));
  const maxDepth = Math.max(...depths);
  for (const r of result) {
    if (r.market_cap_usd === maxCap && maxCap > 0) r.outlier_flags.push("largest market cap");
    if (r.market_cap_usd === minCap && minCap > 0) r.outlier_flags.push("smallest market cap");
    if (r.pipeline_depth === maxDepth && maxDepth > 0) r.outlier_flags.push("deepest pipeline");
  }
  return result;
}
