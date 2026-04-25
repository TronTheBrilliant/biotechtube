// biotechtube/lib/reports/types.ts
// Canonical types for the equity reports pipeline.
// These shape the JSON stored in equity_reports.content_jsonb and the
// strict-output schema sent to V4-Pro.

export type Tier = "snapshot" | "living" | "institutional";

export type Angle = "long" | "short" | "vc" | "bd" | "scientist" | "general";

export type Confidence = "high" | "med" | "low";

export interface ClaimWithSource {
  /** The claim text (one sentence, factual). */
  text: string;
  /** Reference into the bibliography (1-indexed source number). */
  source_id: number;
  /** Set true by fact-check pass if the claim couldn't be verified against input. */
  unverified?: boolean;
}

export interface ReportSection {
  heading: string;
  /** Markdown body. May contain `[1]`-style citation markers tied to source_ids in claims. */
  body: string;
  /** Each factual statement in `body` should appear here with its source_id. */
  claims: ClaimWithSource[];
  /** Model self-assessment of how strongly the input data supports this section. */
  confidence: Confidence;
  /** Model conviction in the thesis expressed by this section (0-100). */
  conviction_score: number;
}

export interface CounterfactualScenario {
  scenario: string;            // e.g. "Phase 2 primary endpoint missed by 20%"
  thesis_impact: string;       // e.g. "Bull case voided; equity downside ~45%"
  probability: number;         // 0-100
}

export interface CatalystEntry {
  title: string;               // "Phase 2 readout NCT12345"
  expected_date: string | null;// ISO date, may be null if "expected H2 2026"
  expected_window: string | null; // "H2 2026", "Q1 2027", etc. — present when date is null
  p_success: number;           // 0-100, our quant model's estimate
  source_id: number;
  rationale: string;           // 1-sentence why the probability is what it is
}

export interface ComparablePeer {
  company_name: string;
  market_cap_usd: number | null;
  pipeline_depth: number;
  cash_runway_months: number | null;
  leadership_avg_tenure_years: number | null;
  outlier_flags: string[];     // e.g. ["lowest market cap of peers", "longest runway"]
}

export interface InvestorSignal {
  investor_name: string;
  cadence_per_year: number;
  sector_concentration: string;       // e.g. "60% oncology"
  last_5_exits: { name: string; outcome: string; year: number }[];
}

export interface QuantSignals {
  funding: {
    p_next_round_12mo: number;        // 0-100
    months_of_runway: number | null;
    lead_investor_cadence_per_year: number | null;
    sector_momentum: number;          // 0-100
    math_explanation: string;         // human-readable formula
  };
  catalysts: CatalystEntry[];
  comparables: ComparablePeer[];
  investor_lens: InvestorSignal[];
}

export interface SourceCitation {
  id: number;
  type: "internal_db" | "sec_edgar" | "clinicaltrials" | "pubmed" | "biorxiv" | "uspto" | "news_article";
  url: string | null;
  title: string;
  retrieved_at: string;               // ISO datetime
}

export interface AngleVariant {
  executive_summary: ReportSection;
  bull_case: ReportSection;
  bear_case: ReportSection;
}

export interface ReportContent {
  /** ISO datetime of generation. */
  generated_at: string;
  /** Per-angle variants. `general` is always present; others added on first buyer with that angle. */
  angles: Partial<Record<Angle, AngleVariant>> & { general: AngleVariant };
  /** Sections shared across angles. */
  pipeline_analysis: ReportSection;
  competitive_landscape: ReportSection;
  catalyst_calendar: { intro: ReportSection; entries: CatalystEntry[] };
  counterfactuals: CounterfactualScenario[];
  valuation_notes: ReportSection;
  sec_highlights: ReportSection;     // empty section if private company
  insider_activity: ReportSection;   // empty section if private company
  literature_watch: ReportSection;
  patent_landscape: ReportSection;
  /** Quant model outputs, embedded for reference + chart rendering. */
  quant_signals: QuantSignals;
  /** Bibliography. claims[].source_id references these by `id`. */
  sources: SourceCitation[];
}

/** Raw external-API data, stored separately so day-14 refresh can reuse unchanged sources. */
export interface EnrichmentBundle {
  sec_edgar?: {
    filings_10k_summary?: string;
    filings_10q_diff?: string;
    insider_form4_summary?: string;
    fetched_at: string;
  };
  clinicaltrials?: {
    by_nct: Record<string, {
      status: string;
      est_completion: string | null;
      enrollment: number | null;
      last_update: string;
    }>;
    fetched_at: string;
  };
  literature?: {
    pubmed: { id: string; title: string; abstract: string; sentiment: "pos" | "neu" | "neg" }[];
    biorxiv: { doi: string; title: string; abstract: string; sentiment: "pos" | "neu" | "neg" }[];
    fetched_at: string;
  };
  uspto?: {
    company_patents: { id: string; title: string; cited_by: number }[];
    competitor_blocking: { id: string; title: string; assignee: string }[];
    fetched_at: string;
  };
}
