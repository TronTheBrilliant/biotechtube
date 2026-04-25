// biotechtube/lib/reports/enrichment/clinicaltrials.ts
// API v2: https://clinicaltrials.gov/api/v2/studies/{nct_id}?format=json

const FETCH_TIMEOUT_MS = 15000;
const withTimeout = () => AbortSignal.timeout(FETCH_TIMEOUT_MS);

export interface ClinicalTrialsByNct {
  status: string;
  est_completion: string | null;
  enrollment: number | null;
  last_update: string;
}

export interface ClinicalTrialsResult {
  by_nct: Record<string, ClinicalTrialsByNct>;
  fetched_at: string;
}

export async function fetchClinicalTrials(nctIds: string[]): Promise<ClinicalTrialsResult> {
  const result: Record<string, ClinicalTrialsByNct> = {};
  const unique = Array.from(new Set(nctIds.filter(Boolean)));
  for (const batch of chunks(unique, 10)) {
    await Promise.all(batch.map(async (nct: string) => {
      const data = await fetchOne(nct).catch(() => null);
      if (data) result[nct] = data;
    }));
  }
  return { by_nct: result, fetched_at: new Date().toISOString() };
}

async function fetchOne(nct: string): Promise<ClinicalTrialsByNct | null> {
  const res = await fetch(`https://clinicaltrials.gov/api/v2/studies/${nct}?format=json`, {
    headers: { Accept: "application/json" }, signal: withTimeout(),
  });
  if (!res.ok) return null;
  const data = await res.json() as any;
  const proto = data.protocolSection ?? {};
  return {
    status: proto.statusModule?.overallStatus ?? "Unknown",
    est_completion: proto.statusModule?.primaryCompletionDateStruct?.date ?? null,
    enrollment: proto.designModule?.enrollmentInfo?.count ?? null,
    last_update: proto.statusModule?.lastUpdatePostDateStruct?.date ?? "",
  };
}

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
