// biotechtube/lib/reports/models/index.ts
import type { QuantSignals, EnrichmentBundle } from "../types";
import { predictFunding } from "./funding-predictor";
import { computeCatalysts } from "./catalyst-probabilities";
import { computeComparables } from "./comparables";
import { computeInvestorLens } from "./investor-lens";

export interface QuantInput {
  company: any;
  pipelines: any[];
  funding_rounds: any[];
  enrichment: EnrichmentBundle;
}

export async function runQuantModels(input: QuantInput): Promise<QuantSignals> {
  const totalRaised = Number(input.company.total_raised ?? 0);
  const employees = Number(input.company.employees ?? 0);
  const annualBurn = employees > 0 ? employees * 250_000 : null;
  const months_of_runway = totalRaised > 0 && annualBurn ? Math.round((totalRaised / annualBurn) * 12) : null;

  const lastRound = input.funding_rounds?.[0];
  const lead = (lastRound as any)?.lead_investor ?? null;
  const lead_investor_cadence_per_year = lead
    ? input.funding_rounds.filter((r: any) => r.lead_investor === lead && r.announced_date &&
        new Date(r.announced_date).getTime() > Date.now() - 365 * 24 * 60 * 60 * 1000).length
    : null;

  const sector_momentum = 50;

  const [funding, catalysts, comparables, investor_lens] = await Promise.all([
    Promise.resolve(predictFunding({ months_of_runway, lead_investor_cadence_per_year, sector_momentum })),
    computeCatalysts({ pipelines: input.pipelines, ct_by_nct: input.enrichment.clinicaltrials?.by_nct }),
    computeComparables(input.company),
    computeInvestorLens(input.company.id),
  ]);

  return { funding, catalysts, comparables, investor_lens };
}
