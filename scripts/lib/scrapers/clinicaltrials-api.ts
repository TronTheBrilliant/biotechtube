/**
 * ClinicalTrials.gov Sponsor Scraper
 * Extracts unique industry sponsors from clinical trials — massive source of biotech company names.
 * Uses the official ClinicalTrials.gov API v2.
 */

export interface ScrapedCompany {
  name: string;
  website: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  source_url: string | null;
}

const CT_API = "https://clinicaltrials.gov/api/v2/studies";

/**
 * Fetch unique industry sponsors from recent clinical trials.
 * @param maxStudies - Max number of studies to scan (default 2000)
 */
export async function scrapeClinicalTrials(maxStudies = 2000): Promise<ScrapedCompany[]> {
  const sponsors = new Map<string, { count: number; conditions: string[] }>();
  let pageToken: string | undefined;
  let fetched = 0;

  while (fetched < maxStudies) {
    const params = new URLSearchParams({
      "query.spons": "INDUSTRY",
      "filter.overallStatus": "RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING",
      "fields": "protocolSection.sponsorCollaboratorsModule,protocolSection.conditionsModule",
      "pageSize": "100",
      "sort": "LastUpdatePostDate:desc",
    });
    if (pageToken) params.set("pageToken", pageToken);

    try {
      const res = await fetch(`${CT_API}?${params}`, {
        headers: { "User-Agent": "BiotechTube (research@biotechtube.io)" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) break;
      const data = await res.json();
      const studies = data.studies || [];

      for (const study of studies) {
        const sponsorModule = study.protocolSection?.sponsorCollaboratorsModule;
        const conditionsModule = study.protocolSection?.conditionsModule;
        if (!sponsorModule) continue;

        // Extract lead sponsor
        const leadSponsor = sponsorModule.leadSponsor;
        if (leadSponsor?.class === "INDUSTRY" && leadSponsor.name) {
          const name = cleanSponsorName(leadSponsor.name);
          if (name && !isGenericName(name)) {
            const existing = sponsors.get(name) || { count: 0, conditions: [] };
            existing.count++;
            const conditions = conditionsModule?.conditions || [];
            for (const c of conditions.slice(0, 2)) {
              if (!existing.conditions.includes(c)) existing.conditions.push(c);
            }
            sponsors.set(name, existing);
          }
        }

        // Extract collaborators
        for (const collab of sponsorModule.collaborators || []) {
          if (collab.class === "INDUSTRY" && collab.name) {
            const name = cleanSponsorName(collab.name);
            if (name && !isGenericName(name)) {
              const existing = sponsors.get(name) || { count: 0, conditions: [] };
              existing.count++;
              sponsors.set(name, existing);
            }
          }
        }
      }

      fetched += studies.length;
      pageToken = data.nextPageToken;
      if (!pageToken || studies.length === 0) break;

      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error("ClinicalTrials API error:", (err as Error).message);
      break;
    }
  }

  // Convert to ScrapedCompany array, sorted by trial count
  const results: ScrapedCompany[] = [];
  const sorted = Array.from(sponsors.entries()).sort((a, b) => b[1].count - a[1].count);

  for (const [name, info] of sorted) {
    results.push({
      name,
      website: null,
      description: info.conditions.length > 0
        ? `Biotech company with ${info.count} active clinical trials in ${info.conditions.slice(0, 3).join(", ")}`
        : null,
      country: null,
      city: null,
      source_url: `https://clinicaltrials.gov/search?spons=${encodeURIComponent(name)}&sponsType=INDUSTRY`,
    });
  }

  return results;
}

function cleanSponsorName(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, " ")  // Remove parenthetical
    .replace(/,?\s*(Inc\.?|Corp\.?|Ltd\.?|LLC|PLC|AG|SA|GmbH|Co\.?)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.length < 3 ||
    lower === "unknown" ||
    lower === "other" ||
    lower.includes("university") ||
    lower.includes("hospital") ||
    lower.includes("institute") ||
    lower.includes("national") ||
    lower.includes("department of") ||
    lower.includes("ministry") ||
    lower.includes("government")
  );
}
