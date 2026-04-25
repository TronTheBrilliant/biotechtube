// biotechtube/lib/reports/enrichment/uspto.ts
// USPTO PatentsView. Requires PATENTSVIEW_API_KEY env var. Returns null if missing.

const FETCH_TIMEOUT_MS = 15000;
const withTimeout = () => AbortSignal.timeout(FETCH_TIMEOUT_MS);

export interface UsptoResult {
  company_patents: { id: string; title: string; cited_by: number }[];
  competitor_blocking: { id: string; title: string; assignee: string }[];
  fetched_at: string;
}

export async function fetchUspto(
  companyName: string,
  mechanismKeywords: string[],
): Promise<UsptoResult | null> {
  const key = process.env.PATENTSVIEW_API_KEY;
  if (!key) {
    console.warn("[uspto] PATENTSVIEW_API_KEY not set; skipping patent enrichment");
    return null;
  }
  const headers: HeadersInit = { "X-Api-Key": key, "Content-Type": "application/json" };

  try {
    const companyRes = await fetch("https://search.patentsview.org/api/v1/patent/", {
      method: "POST",
      headers,
      signal: withTimeout(),
      body: JSON.stringify({
        q: { _text_phrase: { assignee_organization: companyName } },
        f: ["patent_id", "patent_title", "patent_num_times_cited_by_us_patents"],
        s: [{ patent_date: "desc" }],
        o: { size: 20 },
      }),
    });
    const companyData = companyRes.ok ? await companyRes.json() as any : { patents: [] };

    let blocking: any[] = [];
    if (mechanismKeywords.length > 0) {
      const blockingRes = await fetch("https://search.patentsview.org/api/v1/patent/", {
        method: "POST",
        headers,
        signal: withTimeout(),
        body: JSON.stringify({
          q: {
            _and: [
              { _text_any: { patent_abstract: mechanismKeywords.join(" ") } },
              { _neq: { assignee_organization: companyName } },
            ],
          },
          f: ["patent_id", "patent_title", "assignees"],
          s: [{ patent_num_times_cited_by_us_patents: "desc" }],
          o: { size: 10 },
        }),
      });
      const blockingData = blockingRes.ok ? await blockingRes.json() as any : { patents: [] };
      blocking = blockingData.patents ?? [];
    }

    return {
      company_patents: ((companyData.patents ?? []) as any[]).map(p => ({
        id: p.patent_id,
        title: p.patent_title,
        cited_by: Number(p.patent_num_times_cited_by_us_patents ?? 0),
      })),
      competitor_blocking: blocking.map(p => ({
        id: p.patent_id,
        title: p.patent_title,
        assignee: (p.assignees?.[0]?.assignee_organization) ?? "Unknown",
      })),
      fetched_at: new Date().toISOString(),
    };
  } catch (e) {
    console.warn("[uspto] fetch failed:", e);
    return null;
  }
}
