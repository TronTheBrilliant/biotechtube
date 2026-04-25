// biotechtube/lib/reports/models/investor-lens.ts
import { createServerClient } from "@/lib/supabase";
import type { InvestorSignal } from "../types";

export async function computeInvestorLens(companyId: string): Promise<InvestorSignal[]> {
  const supabase = createServerClient();
  // Defensive selects — if columns don't exist on funding_rounds, the query
  // will error and we return [] rather than failing the whole pipeline.
  const { data: rounds, error } = await supabase
    .from("funding_rounds")
    .select("*")
    .eq("company_id", companyId)
    .limit(50);
  if (error || !rounds || rounds.length === 0) return [];

  const tally: Record<string, number> = {};
  for (const r of rounds) {
    const lead = (r as any).lead_investor as string | undefined;
    if (lead) tally[lead] = (tally[lead] ?? 0) + 1;
  }
  const top3 = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);

  const out: InvestorSignal[] = [];
  for (const name of top3) {
    const { data: deals } = await supabase
      .from("funding_rounds")
      .select("*")
      .eq("lead_investor" as any, name)
      .order("announced_date" as any, { ascending: false })
      .limit(50);
    if (!deals) continue;

    const dealsLastYear = deals.filter(d => {
      const announced = (d as any).announced_date as string | undefined;
      return announced && new Date(announced).getTime() > Date.now() - 365 * 24 * 60 * 60 * 1000;
    }).length;

    const sectorTally: Record<string, number> = {};
    for (const d of deals) {
      const sec = (d as any).sector as string | undefined;
      if (sec) sectorTally[sec] = (sectorTally[sec] ?? 0) + 1;
    }
    const topSector = Object.entries(sectorTally).sort((a, b) => b[1] - a[1])[0];
    const sectorConcentration = topSector
      ? `${Math.round((topSector[1] / deals.length) * 100)}% ${topSector[0]}`
      : "unknown";

    const exits = deals
      .filter(d => (d as any).exit_outcome)
      .slice(0, 5)
      .map(d => ({
        name: "(deal)",
        outcome: ((d as any).exit_outcome as string) ?? "unknown",
        year: ((d as any).exit_year as number) ?? 0,
      }));

    out.push({
      investor_name: name,
      cadence_per_year: dealsLastYear,
      sector_concentration: sectorConcentration,
      last_5_exits: exits,
    });
  }
  return out;
}
