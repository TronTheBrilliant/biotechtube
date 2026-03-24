#!/usr/bin/env npx tsx
/**
 * Fetch clinical trial / pipeline data from ClinicalTrials.gov (API v2)
 * for all companies in the database.
 *
 * Inserts results into the `pipelines` table, deduplicating by nct_id.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  ticker: string | null;
  valuation: number | null;
  total_raised: number | null;
}

interface CTStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
    };
    designModule?: {
      phases?: string[];
    };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
    };
    conditionsModule?: {
      conditions?: string[];
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        name?: string;
        type?: string;
      }>;
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string };
    };
  };
}

interface PipelineRow {
  company_id: string;
  company_name: string;
  product_name: string;
  indication: string | null;
  stage: string;
  mechanism_of_action: string | null;
  nct_id: string;
  trial_status: string | null;
  start_date: string | null;
  completion_date: string | null;
  conditions: string[] | null;
  source_name: string;
}

// ── Phase mapping ──────────────────────────────────────────────────────────

const PHASE_MAP: Record<string, string> = {
  EARLY_PHASE1: "Phase 1",
  PHASE1: "Phase 1",
  PHASE2: "Phase 2",
  PHASE3: "Phase 3",
  PHASE4: "Approved",
  NA: "Pre-clinical",
};

const PHASE_RANK: Record<string, number> = {
  "Pre-clinical": 0,
  "Phase 1": 1,
  "Phase 1/2": 2,
  "Phase 2": 3,
  "Phase 2/3": 4,
  "Phase 3": 5,
  Filed: 6,
  Approved: 7,
};

function mapPhase(phases: string[] | undefined): string {
  if (!phases || phases.length === 0) return "Pre-clinical";
  // If phases has two entries like ["PHASE1","PHASE2"], produce "Phase 1/2"
  if (phases.length === 2) {
    const sorted = phases.sort();
    if (sorted[0] === "PHASE1" && sorted[1] === "PHASE2") return "Phase 1/2";
    if (sorted[0] === "PHASE2" && sorted[1] === "PHASE3") return "Phase 2/3";
  }
  // Use highest single phase
  let best = "Pre-clinical";
  let bestRank = -1;
  for (const p of phases) {
    const mapped = PHASE_MAP[p] || "Pre-clinical";
    const rank = PHASE_RANK[mapped] ?? -1;
    if (rank > bestRank) {
      best = mapped;
      bestRank = rank;
    }
  }
  return best;
}

function mapStatus(status: string | undefined): string | null {
  if (!status) return null;
  const map: Record<string, string> = {
    RECRUITING: "Recruiting",
    ACTIVE_NOT_RECRUITING: "Active",
    COMPLETED: "Completed",
    TERMINATED: "Terminated",
    WITHDRAWN: "Withdrawn",
    ENROLLING_BY_INVITATION: "Recruiting",
    NOT_YET_RECRUITING: "Recruiting",
    SUSPENDED: "Active",
    UNKNOWN_STATUS: "Active",
    AVAILABLE: "Active",
    NO_LONGER_AVAILABLE: "Completed",
    TEMPORARILY_NOT_AVAILABLE: "Active",
    APPROVED_FOR_MARKETING: "Completed",
    WITHHELD: "Active",
  };
  return map[status] || status;
}

/** Parse ClinicalTrials.gov date strings like "2023-05-01", "2023-05", or "May 2023" */
function parseCtDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  // Full ISO date "2023-05-01"
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
  // Partial ISO "2023-05" -> append day
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
  // Year only "2023"
  if (/^\d{4}$/.test(dateStr)) return `${dateStr}-01-01`;
  // "May 2023" format
  const m = dateStr.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i
  );
  if (m) {
    const months: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
    };
    return `${m[2]}-${months[m[1].toLowerCase()]}-01`;
  }
  // "May 15, 2023"
  const m2 = dateStr.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})$/i
  );
  if (m2) {
    const months: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
    };
    return `${m2[3]}-${months[m2[1].toLowerCase()]}-${m2[2].padStart(2, "0")}`;
  }
  return null;
}

// ── Rate limiter ───────────────────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  constructor(private maxPerSec: number) {}

  async wait() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 1000);
    if (this.timestamps.length >= this.maxPerSec) {
      const oldest = this.timestamps[0];
      const delay = 1000 - (now - oldest) + 10;
      await new Promise((r) => setTimeout(r, delay));
    }
    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(3);

// ── ClinicalTrials.gov fetcher ─────────────────────────────────────────────

const CT_BASE = "https://clinicaltrials.gov/api/v2/studies";
const CT_FIELDS = [
  "NCTId",
  "BriefTitle",
  "Phase",
  "OverallStatus",
  "Condition",
  "InterventionName",
  "InterventionType",
  "StartDate",
  "CompletionDate",
  "LeadSponsorName",
].join(",");

async function fetchTrials(sponsorName: string): Promise<CTStudy[]> {
  const allStudies: CTStudy[] = [];
  let pageToken: string | null = null;

  do {
    await rateLimiter.wait();
    const params = new URLSearchParams({
      "query.spons": sponsorName,
      pageSize: "100",
      fields: CT_FIELDS,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const url = `${CT_BASE}?${params.toString()}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        if (resp.status === 429) {
          // rate limited, wait and retry
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        console.error(`  API error ${resp.status} for "${sponsorName}"`);
        break;
      }
      const data = await resp.json();
      const studies: CTStudy[] = data.studies || [];
      allStudies.push(...studies);
      pageToken = data.nextPageToken || null;
    } catch (err: unknown) {
      console.error(`  Fetch error for "${sponsorName}": ${err}`);
      break;
    }
  } while (pageToken);

  return allStudies;
}

// ── Extract pipeline rows from studies ─────────────────────────────────────

function extractPipelineRows(
  studies: CTStudy[],
  companyId: string,
  companyName: string
): PipelineRow[] {
  const rows: PipelineRow[] = [];

  for (const study of studies) {
    const ps = study.protocolSection;
    if (!ps) continue;

    const nctId = ps.identificationModule?.nctId;
    if (!nctId) continue;

    // Get drug/biological interventions
    const interventions = (ps.armsInterventionsModule?.interventions || [])
      .filter((iv) => iv.type === "DRUG" || iv.type === "BIOLOGICAL");

    if (interventions.length === 0) continue; // skip non-drug trials

    const productName =
      interventions.map((iv) => iv.name).filter(Boolean).join(" + ") ||
      ps.identificationModule?.briefTitle ||
      "Unknown";

    const phase = mapPhase(ps.designModule?.phases);
    const conditions = ps.conditionsModule?.conditions || [];

    rows.push({
      company_id: companyId,
      company_name: companyName,
      product_name: productName,
      indication: conditions.length > 0 ? conditions[0] : null,
      stage: phase,
      mechanism_of_action: null,
      nct_id: nctId,
      trial_status: mapStatus(ps.statusModule?.overallStatus),
      start_date: parseCtDate(ps.statusModule?.startDateStruct?.date),
      completion_date: parseCtDate(ps.statusModule?.completionDateStruct?.date),
      conditions: conditions.length > 0 ? conditions : null,
      source_name: "clinicaltrials.gov",
    });
  }

  return rows;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Fetching Clinical Trials Pipeline Data ===\n");

  // 1. Get top 1000 companies by valuation (prioritise those with tickers)
  const { data: companiesRaw, error: compErr } = await supabase
    .from("companies")
    .select("id, name, ticker, valuation, total_raised")
    .order("valuation", { ascending: false, nullsFirst: false })
    .limit(1000);

  if (compErr) {
    console.error("Failed to fetch companies:", compErr.message);
    return;
  }

  const companies: Company[] = (companiesRaw || []) as Company[];
  console.log(`Loaded ${companies.length} companies (ordered by valuation desc)\n`);

  // 2. Get existing nct_ids for dedup
  const { data: existingRows } = await supabase
    .from("pipelines")
    .select("nct_id");
  const existingNctIds = new Set(
    (existingRows || []).map((r: { nct_id: string }) => r.nct_id).filter(Boolean)
  );
  console.log(`Existing pipeline entries: ${existingNctIds.size}\n`);

  // 3. Process each company
  let totalInserted = 0;
  let totalTrials = 0;
  let companiesProcessed = 0;
  let companiesWithTrials = 0;

  for (const company of companies) {
    companiesProcessed++;
    const pct = ((companiesProcessed / companies.length) * 100).toFixed(0);

    // Try exact name first
    let studies = await fetchTrials(company.name);

    // If no results and name has common suffixes, try base name
    if (studies.length === 0) {
      const altName = company.name
        .replace(/,?\s*(Inc\.?|Corp\.?|Ltd\.?|LLC|PLC|plc|S\.A\.?|SE|NV|AG|Co\.?|Group|Holdings?|Pharmaceutical[s]?|Therapeutics?|Biosciences?|Biopharma|Biotech(nology)?)\s*/gi, " ")
        .trim();
      if (altName !== company.name && altName.length > 2) {
        studies = await fetchTrials(altName);
      }
    }

    if (studies.length === 0) {
      if (companiesProcessed % 50 === 0) {
        console.log(`[${pct}%] ${companiesProcessed}/${companies.length} processed, ${totalInserted} inserted so far`);
      }
      continue;
    }

    companiesWithTrials++;
    totalTrials += studies.length;

    const rows = extractPipelineRows(studies, company.id, company.name);

    // Filter out existing nct_ids
    const newRows = rows.filter((r) => !existingNctIds.has(r.nct_id));
    if (newRows.length === 0) {
      console.log(`[${pct}%] ${company.name}: ${studies.length} trials, 0 new (all exist)`);
      continue;
    }

    // Insert in batches of 100
    let batchInserted = 0;
    for (let i = 0; i < newRows.length; i += 100) {
      const batch = newRows.slice(i, i + 100);
      const { error } = await supabase
        .from("pipelines")
        .upsert(batch, { onConflict: "nct_id", ignoreDuplicates: true });
      if (error) {
        console.error(`  Insert error for ${company.name}: ${error.message}`);
      } else {
        batchInserted += batch.length;
        for (const r of batch) existingNctIds.add(r.nct_id);
      }
    }

    totalInserted += batchInserted;
    console.log(
      `[${pct}%] ${company.name}: ${studies.length} trials -> ${batchInserted} inserted`
    );
  }

  // 4. Summary
  console.log("\n=== Summary ===");
  console.log(`Companies processed:    ${companiesProcessed}`);
  console.log(`Companies with trials:  ${companiesWithTrials}`);
  console.log(`Total trials found:     ${totalTrials}`);
  console.log(`New entries inserted:   ${totalInserted}`);
  console.log(`Total in pipelines:     ${existingNctIds.size}`);

  // Phase breakdown
  const { data: phaseData } = await supabase
    .from("pipelines")
    .select("stage");
  if (phaseData) {
    const phaseCounts: Record<string, number> = {};
    for (const r of phaseData) {
      phaseCounts[r.stage] = (phaseCounts[r.stage] || 0) + 1;
    }
    console.log("\nPhase breakdown:");
    for (const [phase, count] of Object.entries(phaseCounts).sort(
      (a, b) => (PHASE_RANK[a[0]] ?? 99) - (PHASE_RANK[b[0]] ?? 99)
    )) {
      console.log(`  ${phase}: ${count}`);
    }
  }
}

main().catch(console.error);
