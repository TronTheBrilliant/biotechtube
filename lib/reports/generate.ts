// biotechtube/lib/reports/generate.ts
// Orchestrator for equity report generation.
// Chunk 2 = MVP: internal DB context + V4-Pro main call + render PDF + insert row.
// Chunks 3-4 layer on enrichment, quant models, angle rewrite, fact-check, audio, SVG.

import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase";
import type { Angle, ReportContent, EnrichmentBundle, QuantSignals } from "./types";
import { STATIC_PREFIX } from "./prompts/static-prefix";
import { REPORT_OUTPUT_SCHEMA } from "./prompts/schema";
import { renderPdf } from "./render-pdf";
import { publish } from "./publisher";
import { buildEnrichmentBundle } from "./enrichment";
import { runQuantModels } from "./models";
import { factCheck } from "./fact-check";
import { rewriteForAngle } from "./angle-rewrite";
import { renderMechanismSvg } from "./render-mechanism-svg";
import { renderAudio } from "./render-audio";

const REPORT_TTL_DAYS = 14;

export interface GenerateOptions {
  companyId: string;
  /** v1 angle on first generation. Additional angles are added later via ensureAngle(). */
  angle?: Angle;
  /** Optional: existing purchase to mark `ready` when generation completes. */
  purchaseId?: string;
}

export interface GenerateResult {
  reportId: string;
  costCents: number;
  generationSeconds: number;
}

function getDeepSeek() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set");
  return new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: key });
}

/**
 * Generate an equity research report end-to-end.
 * MVP: internal DB only, no enrichment, no quant models. PDF rendered + uploaded.
 */
export async function generateEquityReport(opts: GenerateOptions): Promise<GenerateResult> {
  const start = Date.now();
  const supabase = createServerClient();

  const internal = await buildInternalContext(opts.companyId);

  const mechanismKeywords =
    (internal.company as any).mechanism_keywords ??
    Array.from(new Set(
      (internal.pipelines ?? [])
        .map((p: any) => (p.indication ?? "").toLowerCase().split(/[\s,]+/))
        .flat()
        .filter((s: string) => s.length > 3)
    )).slice(0, 3);

  const enrichment = await buildEnrichmentBundle({
    company: { name: internal.company.name, ticker: internal.company.ticker ?? null, mechanism_keywords: mechanismKeywords },
    pipelines: internal.pipelines,
  });

  const quant = await runQuantModels({
    company: internal.company,
    pipelines: internal.pipelines,
    funding_rounds: internal.funding_rounds,
    enrichment,
  });

  const dynamicSuffix = buildDynamicSuffix(internal, enrichment, quant, opts.angle ?? "general");

  const ds = getDeepSeek();
  const completion = await ds.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [
      { role: "system", content: STATIC_PREFIX },
      { role: "user", content: dynamicSuffix },
    ],
    response_format: { type: "json_object" },
    max_tokens: 16000,
    temperature: 0.4,
    // Thinking-mode hint passed through to DeepSeek via extra_body. The OpenAI
    // SDK types may or may not accept this depending on version; cast to satisfy.
    ...({ extra_body: { thinking: "enabled" } } as any),
  } as any);

  const usage = completion.usage;
  const costCents = estimateCostCents(usage);
  const raw = completion.choices[0]?.message?.content ?? "";

  let content: ReportContent;
  try {
    content = JSON.parse(raw);
  } catch (err) {
    throw new Error(`V4-Pro returned non-JSON: ${raw.slice(0, 500)}`);
  }

  // 1. Angle rewrite first (if buyer wants a non-general angle)
  if (opts.angle && opts.angle !== "general" && !content.angles[opts.angle]) {
    content.angles[opts.angle] = await rewriteForAngle(content, opts.angle);
  }
  // 2. Fact-check the entire content (covers all angle variants)
  const factChecked = await factCheck(content, dynamicSuffix);

  const mechanismSvg = renderMechanismSvg({
    companyName: internal.company.name,
    competitors: internal.competitors.map((c: any) => ({
      name: c.name,
      mechanism: c.sector ?? null,
      pipeline_depth: 0,
    })),
  });

  const [pdfBytes, audioBytes] = await Promise.all([
    renderPdf({ content: factChecked, company: internal.company }),
    renderAudio(factChecked),
  ]);

  const result = await publish({
    companyId: opts.companyId,
    content: factChecked,
    enrichment,
    pdfBytes,
    audioBytes,
    mechanismSvg,
    costCents,
    generationSeconds: Math.round((Date.now() - start) / 1000),
    expiresAt: new Date(Date.now() + REPORT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (opts.purchaseId) {
    await supabase
      .from("equity_report_purchases")
      .update({ status: "ready", equity_report_id: result.reportId })
      .eq("id", opts.purchaseId);
  }

  return result;
}

interface InternalContext {
  company: any;
  pipelines: any[];
  funding_rounds: any[];
  recent_articles: any[];
  competitors: any[];
}

async function buildInternalContext(companyId: string): Promise<InternalContext> {
  const supabase = createServerClient();
  const companyRes = await supabase.from("companies").select("*").eq("id", companyId).single();
  if (companyRes.error || !companyRes.data) {
    throw new Error(`Company ${companyId} not found: ${companyRes.error?.message}`);
  }
  const company = companyRes.data as any;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [pipelinesRes, fundingRes, articlesRes] = await Promise.all([
    supabase.from("pipelines").select("*").eq("company_id", companyId).limit(100),
    supabase.from("funding_rounds").select("*").eq("company_id", companyId)
      .order("announced_date", { ascending: false }).limit(50),
    // Schema: articles.headline (not "title"); funding_rounds.announced_date (not "announced_at")
    supabase.from("articles").select("id, headline, slug, body, published_at")
      .gte("published_at", ninetyDaysAgo)
      .or(`headline.ilike.%${(company.name ?? "").replace(/[%_,]/g, m => "\\" + m)}%,body.ilike.%${(company.name ?? "").replace(/[%_,]/g, m => "\\" + m)}%`)
      .limit(30),
  ]);

  const pipelines = pipelinesRes.data ?? [];
  const funding_rounds = fundingRes.data ?? [];
  const recent_articles = articlesRes.data ?? [];

  let competitors: any[] = [];
  if (company.sector) {
    const compRes = await supabase
      .from("companies")
      .select("id, name, slug, total_raised, valuation, employees, founded")
      .eq("sector", company.sector)
      .neq("id", companyId)
      .order("total_raised", { ascending: false, nullsFirst: false })
      .limit(5);
    competitors = compRes.data ?? [];
  }

  return { company, pipelines, funding_rounds, recent_articles, competitors };
}

function buildDynamicSuffix(ctx: InternalContext, enr: EnrichmentBundle, quant: QuantSignals, angle: Angle): string {
  return `# Output Schema
${REPORT_OUTPUT_SCHEMA}

# Buyer Angle
The buyer is reading this from the angle of: \`${angle}\`.
Tailor the executive_summary + bull_case + bear_case under angles.${angle} for that lens.
Always also produce angles.general (the default variant).

# Per-Company Data (internal)

## Company
${JSON.stringify(ctx.company, null, 2)}

## Pipelines (${ctx.pipelines.length} entries)
${JSON.stringify(ctx.pipelines.slice(0, 50), null, 2)}

## Funding History (${ctx.funding_rounds.length} entries)
${JSON.stringify(ctx.funding_rounds.slice(0, 30), null, 2)}

## Recent Articles (${ctx.recent_articles.length} entries, last 90d)
${JSON.stringify(ctx.recent_articles.slice(0, 20), null, 2)}

## Top Competitors (${ctx.competitors.length})
${JSON.stringify(ctx.competitors, null, 2)}

# External Enrichment

## SEC EDGAR
${enr.sec_edgar ? JSON.stringify(enr.sec_edgar, null, 2).slice(0, 12000) : "Not available (private company or fetch failed)."}

## ClinicalTrials.gov (per-NCT live data)
${enr.clinicaltrials ? JSON.stringify(enr.clinicaltrials.by_nct, null, 2).slice(0, 6000) : "No NCTs in pipeline."}

## Literature (last 90d, sentiment-tagged)
${enr.literature ? JSON.stringify(enr.literature, null, 2).slice(0, 8000) : "No literature available."}

## Patent Landscape
${enr.uspto ? JSON.stringify(enr.uspto, null, 2).slice(0, 6000) : "No patent data available."}

# Quant Signals (deterministic, do not modify in your output — echo verbatim into quant_signals)
${JSON.stringify(quant, null, 2)}

# Bibliography Bootstrap
Use these as your starting source IDs. Add additional sources as needed for article URLs etc.
- 1: internal_db (BiotechTube companies/pipelines/funding/articles)
${enr.sec_edgar ? `- 2: sec_edgar (latest 10-K + 10-Q + Form 4)` : ""}
${enr.clinicaltrials ? `- 3: clinicaltrials (per-NCT live status)` : ""}
${enr.literature ? `- 4: pubmed (last 90d search)` : ""}
${enr.literature ? `- 5: biorxiv (last 90d search)` : ""}
${enr.uspto ? `- 6: uspto (PatentsView)` : ""}

Generate the report now.`;
}

function estimateCostCents(usage: OpenAI.CompletionUsage | undefined): number {
  if (!usage) return 0;
  const inputCents = (usage.prompt_tokens / 1_000_000) * (1.74 + 0.145) / 2 * 100;
  const outputCents = (usage.completion_tokens / 1_000_000) * 3.48 * 100;
  return Math.round(inputCents + outputCents);
}
