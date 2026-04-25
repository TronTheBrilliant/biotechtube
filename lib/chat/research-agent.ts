// biotechtube/lib/chat/research-agent.ts
import { createServerClient } from "@/lib/supabase";

export const RESEARCH_AGENT_SYSTEM = `You are BiotechTube's research analyst answering follow-up questions about a specific company's equity research memo. Use ONLY the provided memo context — never your own training knowledge — and cite source IDs from the memo's bibliography in [N] form. If the memo doesn't contain the answer, say "the memo doesn't cover that" and suggest a related question that's grounded.`;

export async function loadAgentContext(purchaseId: string): Promise<{ memo: string; companyName: string } | null> {
  const supabase = createServerClient();
  const { data: purchase } = await supabase
    .from("equity_report_purchases")
    .select("equity_report_id, company_id, tier, status, live_access_expires_at")
    .eq("id", purchaseId)
    .maybeSingle();
  if (!purchase || purchase.tier !== "living" || purchase.status !== "ready") return null;
  if (purchase.live_access_expires_at && new Date(purchase.live_access_expires_at) < new Date()) return null;

  const { data: report } = await supabase
    .from("equity_reports")
    .select("content_jsonb, enrichment_jsonb")
    .eq("id", purchase.equity_report_id!)
    .single();
  if (!report) return null;

  const { data: company } = await supabase.from("companies").select("name").eq("id", purchase.company_id).single();

  const memo = JSON.stringify({
    content: report.content_jsonb,
    enrichment_summary: summarizeEnrichment(report.enrichment_jsonb as any),
  }, null, 2).slice(0, 60_000);

  return { memo, companyName: company?.name ?? "the company" };
}

function summarizeEnrichment(e: any): any {
  if (!e) return null;
  return {
    has_sec: !!e.sec_edgar,
    insider_summary: e.sec_edgar?.insider_form4_summary,
    nct_count: Object.keys(e.clinicaltrials?.by_nct ?? {}).length,
    pubmed_count: e.literature?.pubmed?.length ?? 0,
    biorxiv_count: e.literature?.biorxiv?.length ?? 0,
    patent_count: e.uspto?.company_patents?.length ?? 0,
  };
}
