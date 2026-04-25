// biotechtube/lib/reports/enrichment/index.ts
// Parallel fetch of all 4 external enrichment sources for a company.

import type { EnrichmentBundle } from "../types";
import { fetchSecEdgar } from "./sec-edgar";
import { fetchClinicalTrials } from "./clinicaltrials";
import { fetchLiterature } from "./literature";
import { fetchUspto } from "./uspto";

export interface EnrichmentInput {
  company: { name: string; ticker?: string | null; mechanism_keywords?: string[] | null };
  pipelines: { trial_id?: string | null }[];
}

export async function buildEnrichmentBundle(input: EnrichmentInput): Promise<EnrichmentBundle> {
  const nctIds = (input.pipelines ?? [])
    .map(p => p.trial_id ?? "")
    .filter(s => /^NCT\d+/i.test(s));

  const mechanism = (input.company.mechanism_keywords ?? []).join(" ") || input.company.name;
  const mechanismKw = (input.company.mechanism_keywords ?? []).filter(Boolean);

  const [sec, ct, lit, pat] = await Promise.all([
    fetchSecEdgar(input.company.ticker ?? null),
    fetchClinicalTrials(nctIds),
    fetchLiterature(mechanism),
    fetchUspto(input.company.name, mechanismKw),
  ]);

  return {
    sec_edgar: sec ?? undefined,
    clinicaltrials: ct,
    literature: lit,
    uspto: pat ?? undefined,
  };
}
