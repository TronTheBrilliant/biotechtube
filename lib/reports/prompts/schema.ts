// biotechtube/lib/reports/prompts/schema.ts
// JSON-shape description sent to V4-Pro alongside the per-company data.
// Models follow examples better than prose schemas; keep examples minimal but complete.

export const REPORT_OUTPUT_SCHEMA = `Return a single JSON object matching this exact shape (no markdown fences):

{
  "generated_at": "2026-04-25T12:00:00Z",
  "angles": {
    "general": {
      "executive_summary": { /* ReportSection */ },
      "bull_case": { /* ReportSection */ },
      "bear_case": { /* ReportSection */ }
    }
  },
  "pipeline_analysis": { /* ReportSection */ },
  "competitive_landscape": { /* ReportSection */ },
  "catalyst_calendar": {
    "intro": { /* ReportSection */ },
    "entries": [ /* CatalystEntry[] — copy from quant_signals.catalysts and add narrative entries */ ]
  },
  "counterfactuals": [
    { "scenario": "...", "thesis_impact": "...", "probability": 35 },
    { "scenario": "...", "thesis_impact": "...", "probability": 20 },
    { "scenario": "...", "thesis_impact": "...", "probability": 15 }
  ],
  "valuation_notes": { /* ReportSection */ },
  "sec_highlights": { /* ReportSection — return empty body + claims=[] if private company */ },
  "insider_activity": { /* ReportSection — same */ },
  "literature_watch": { /* ReportSection */ },
  "patent_landscape": { /* ReportSection */ },
  "quant_signals": { /* echo the QuantSignals provided in input verbatim — do not modify */ },
  "sources": [
    { "id": 1, "type": "internal_db", "url": null, "title": "BiotechTube companies row", "retrieved_at": "..." }
  ]
}

ReportSection shape:
{
  "heading": "Pipeline Analysis",
  "body": "Markdown body with [1] citations.",
  "claims": [
    { "text": "Lead candidate is in Phase 2 [1].", "source_id": 1 }
  ],
  "confidence": "high",
  "conviction_score": 72
}

CatalystEntry shape:
{
  "title": "Phase 2 readout NCT12345",
  "expected_date": "2026-09-01",
  "expected_window": null,
  "p_success": 38,
  "source_id": 5,
  "rationale": "Base rate for indication adjusted for trial design quality."
}
`;
