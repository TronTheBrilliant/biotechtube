// biotechtube/lib/reports/models/catalyst-probabilities.ts
import { createServerClient } from "@/lib/supabase";
import type { CatalystEntry } from "../types";

export interface CatalystInput {
  pipelines: { product_name?: string; indication?: string | null; stage?: string | null; trial_id?: string | null }[];
  ct_by_nct?: Record<string, { status: string; est_completion: string | null }>;
}

const DEFAULT_BASE_RATES: Record<string, number> = {
  "Pre-clinical": 60,
  "Phase 1":      63,
  "Phase 1/2":    50,
  "Phase 2":      32,
  "Phase 2/3":    40,
  "Phase 3":      58,
  "Approved":     100,
};

export async function computeCatalysts(input: CatalystInput): Promise<CatalystEntry[]> {
  const supabase = createServerClient();
  const entries: CatalystEntry[] = [];
  let sourceId = 100;

  for (const p of input.pipelines ?? []) {
    if (!p.stage) continue;
    const baseRate = DEFAULT_BASE_RATES[p.stage] ?? null;
    if (baseRate === null) continue;

    let adjusted = baseRate;
    let rationale = `Base rate for ${p.stage} ${p.indication ?? ""}: ${baseRate}%.`;
    if (p.indication) {
      const { data: hist } = await supabase
        .from("pipelines")
        .select("stage")
        .ilike("indication", `%${p.indication}%`)
        .limit(200);
      if (hist && hist.length >= 10) {
        const advanced = hist.filter(h => /^Phase 3|Approved/i.test(h.stage ?? "")).length;
        const histRate = Math.round((advanced / hist.length) * 100);
        adjusted = Math.round(0.6 * baseRate + 0.4 * histRate);
        rationale = `Base rate ${baseRate}% adjusted by historical ${p.indication} cohort (n=${hist.length}, ${histRate}% advanced ≥ Phase 3).`;
      }
    }

    const ct = p.trial_id && input.ct_by_nct?.[p.trial_id];
    entries.push({
      title: `${p.stage} readout: ${p.product_name ?? p.trial_id ?? p.indication}`,
      expected_date: ct ? ct.est_completion : null,
      expected_window: ct?.est_completion ? null : "TBD",
      p_success: adjusted,
      source_id: sourceId++,
      rationale,
    });
  }

  return entries.slice(0, 12);
}
