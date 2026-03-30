# Enrichment Pipeline Design

> Fill all 11,088 company profiles with high-quality, factual content and expert reports.

## Problem

- 9,978 companies (90%) have no expert report
- 7,706 companies have short descriptions (50-200 chars, scraped meta tags)
- 453 companies have no description at all
- Existing report generation goes through Next.js API route (slow, requires dev server)

## Architecture: Two-Pass Pipeline

### Pass 1: Fast Bulk (DeepSeek)

- **Target:** 9,978 companies without reports (skip existing 1,110)
- **Scraping:** Existing fetch() approach (homepage + up to 5 subpages). Free. ~30-50% of JS-heavy sites will return minimal content — that's expected. Pass 1 reports for those companies will rely on DB data + model knowledge.
- **Model:** DeepSeek `deepseek-chat` (V3) via `api.deepseek.com`
- **Workers:** 10 parallel, 2-second delay per worker
- **Estimated tokens per company:** ~3,000 input (compact prompt, DB context, scraped text capped at 6K chars) + ~2,000 output (JSON report). Prompt is deliberately shorter than existing route.ts prompt to reduce cost.
- **Cost:** ~$8-10 of DeepSeek credits (9,978 × 3K input × $0.14/M + 9,978 × 2K output × $0.28/M)
- **Time:** ~5-8 hours (each company: ~8s scrape + ~15s AI + ~2s DB = ~25s. 10 workers = ~7 hours)
- **Output:** Full report JSON + enriched company fields + updated quality score

### Pass 2: Quality Tier (Spider + Claude Haiku 4.5)

- **Target:** ~1,500 companies (all 1,039 public + top ~461 private by valuation, where valuation IS NOT NULL, ordered DESC)
- **Scraping:** Spider.cloud API for JS-rendered markdown content
- **Model:** Claude Haiku 4.5 `claude-haiku-4-5-20251001` via Anthropic SDK (already installed)
- **Workers:** 8 parallel, 1-second delay per worker
- **Estimated tokens per company:** ~3,000 input (richer prompt with Spider content + sector context, capped to control cost) + ~2,000 output (premium report)
- **Cost:** ~$0.72 Spider + ~$10-12 Anthropic credits (1,500 × 3K × $1/M input + 1,500 × 2K × $5/M output = $4.50 + $15 ≈ $19.50 worst case). To stay within $14.41 budget: cap at ~900 companies (all public with ticker, skip private tier) or reduce output to ~1,500 tokens. Script will use `--budget` flag to hard-stop at limit.
- **Time:** ~2-3 hours
- **Output:** Premium quality reports, overwriting Pass 1 reports where they exist
- **Includes:** Regenerating existing reports for companies in the top 1,500 tier

### Existing 1,110 reports

- Skipped in Pass 1 (already have reports)
- Regenerated in Pass 2 only if they fall within the top 1,500 quality tier

## Data Flow

### Pass 1 — Input per company (from DB, no scraping cost):

```
companies table:      name, country, city, founded, categories,
                      ticker, valuation, description, website
company_price_history: latest market cap, 52-week price data (for 1,010 public)
product_scores:        matching product scores (54,699 rows available)
profile_quality:       existing issues, quality score
Website scrape:        homepage + up to 5 subpages (existing fetch approach)
```

### Pass 2 — Input per company (richer):

```
Everything from Pass 1, PLUS:
Spider.cloud scrape:   full JS-rendered content as clean markdown
Pass 1 report:         use as baseline to improve upon (if exists)
Sector context:        "ranked #X in [sector] by market cap"
Country context:       "one of N biotech companies in [country]"
```

### Output — writes to:

```
company_reports:  full report JSON (description, summary, deep_report,
                  pipeline_programs, key_people, funding, investors, etc.)
companies:        backfill missing/short fields (description if < 200 chars,
                  city, founded, employees, ticker if discovered)
profile_quality:  updated quality_score + last_checked_at
```

## Script Design

### New file: `scripts/enrichment-pipeline.ts`

Single script with two modes:

```bash
npx tsx scripts/enrichment-pipeline.ts --pass1              # Fast bulk (DeepSeek)
npx tsx scripts/enrichment-pipeline.ts --pass2              # Quality tier (Spider + Haiku)
npx tsx scripts/enrichment-pipeline.ts --pass1 --limit 50   # Test run
npx tsx scripts/enrichment-pipeline.ts --pass2 --limit 10   # Test run
npx tsx scripts/enrichment-pipeline.ts --retry-failures     # Retry failed companies
npx tsx scripts/enrichment-pipeline.ts --dry-run --pass1    # Preview without API calls
```

### Key design decisions:

1. **Direct DB + API calls** — does NOT go through the Next.js API route. No need for localhost:3000 running. Eliminates HTTP overhead and 3-minute timeout.

2. **Parallel workers** — 10 for Pass 1, 8 for Pass 2. Each worker processes its chunk independently. Same pattern as existing `batch-generate-reports.ts`.

3. **Enriched prompts** — fetches price history, product scores, sector context from Supabase and feeds into the prompt. Current report generator only feeds the `companies` row + scraped website.

4. **Spider integration (Pass 2 only)** — calls Spider API for clean JS-rendered markdown. Falls back to existing fetch() if Spider fails for a given URL.

5. **Resume support** — tracks progress in `scripts/.enrichment-progress.json`. Re-running skips already-completed companies.

6. **Writes to both tables** — `company_reports` (full report) and `companies` (enriched fields + upgraded description).

### What stays unchanged:

- Same `company_reports` table schema — no migration needed
- Same report JSON structure (description, deep_report, pipeline_programs, key_people, etc.)
- Same `profile_quality` scoring logic from CIA agent
- Existing `/api/reports/generate` route untouched — still works for on-demand reports

## DB Write Strategy

### `company_reports` table

- Column name is `report_slug` (not `slug`). Unique constraint is on `company_id`.
- Use **delete-then-insert** pattern (same as existing route.ts) to handle potential duplicate rows cleanly.
- The `description` field from the AI response is NOT stored in `company_reports` — it goes to `companies.description`. The `company_reports` table has no `description` column.

### `companies` table

- `description` from AI → `companies.description` (only if current description < 200 chars)
- `founded`, `headquarters_city`, `headquarters_country`, `employee_estimate` → backfill only if null/empty
- `ticker`, `exchange` → backfill only if null (Pass 1 may discover tickers for private companies)

### `profile_quality` table

- Import scoring logic from `scripts/cia-agent.ts` `calculateScore()` function into a shared utility
- Upsert with `onConflict: 'company_id'`

### Tagging reports by pass

- Prepend `"source:pass1_deepseek"` or `"source:pass2_haiku"` to the `pages_scraped` text array
- No schema migration needed — reuses existing column
- This enables bulk identification/rollback if a pass produces poor results

## Prompt Strategy

### Pass 1 prompt (compact, cost-efficient)

Based on the existing prompt in `/api/reports/generate/route.ts` lines 165-245 but shortened:
- Remove verbose instructions, keep the JSON schema definition
- Cap website content at 6,000 chars (not 20,000) to reduce input tokens
- Include DB context: name, country, city, founded, categories, ticker, valuation, existing description
- Include market data for public companies: latest market cap, 52-week range
- Omit product_scores in Pass 1 (saves tokens, marginal value for most companies)
- System message: "Return ONLY valid JSON. Be factual. 800-1200 word deep_report."

### Pass 2 prompt (rich, quality-focused)

Full version of existing prompt, enhanced with:
- Spider-scraped website content (clean markdown, up to 15,000 chars)
- Pass 1 report as baseline: "Here is an existing report. Improve it with deeper analysis."
- Sector context: "This company ranks #X out of Y in the {sector} sector by market cap"
- Country context: "One of N biotech companies in {country}"
- Market data: full price history summary, 52-week high/low, volume
- Product scores if available
- System message: "Write an engaging, authoritative analyst report. 1500-2000 word deep_report."

### JSON validation

Parse AI response with the existing fallback chain (raw JSON → markdown fence extraction → brace matching). After parsing, validate required fields exist (`summary`, `deep_report`) before writing to DB. Log and skip companies where JSON parsing fails entirely.

## Report JSON Structure

The AI returns this JSON. The `description` field is extracted and written to `companies.description`. All other fields go to `company_reports`.

```json
{
  "description": "2-3 sentence profile description (→ written to companies.description)",
  "summary": "3-4 sentence executive summary",
  "deep_report": "1000-2000 word markdown report with sections",
  "founded": 2015,
  "headquarters_city": "Boston",
  "headquarters_country": "United States",
  "employee_estimate": "50-100",
  "business_model": "Therapeutics",
  "revenue_status": "Pre-revenue",
  "stage": "Phase 2",
  "company_type": "Public",
  "ticker": "XYZ",
  "exchange": "NASDAQ",
  "therapeutic_areas": ["Oncology", "Immunology"],
  "technology_platform": "mRNA-based cancer vaccines",
  "pipeline_programs": [
    {"name": "Drug-001", "indication": "NSCLC", "phase": "Phase 2", "status": "Active"}
  ],
  "key_people": [
    {"name": "Jane Smith", "role": "CEO"}
  ],
  "investors": ["OrbiMed", "RA Capital"],
  "partners": ["Roche"],
  "opportunities": "...",
  "risks": "...",
  "competitive_landscape": "..."
}
```

## Error Handling

- **Per-company failures:** Log and continue. Never stop the batch.
- **Failed companies:** Written to `scripts/.enrichment-failures.json` for re-run via `--retry-failures`
- **Retries:** Max 3 per company with exponential backoff before marking as failed
- **Rate limits:** Exponential backoff on 429 responses from any API

## Data Safety

- Pass 1 only overwrites descriptions currently < 200 chars. Never downgrades a good description.
- Pass 2 always overwrites reports (upgrading quality is the purpose).
- Both passes preserve existing data in fields they cannot improve (never nulls out a city that already exists).

## Cost Guardrails

- `--dry-run` flag: preview what would be processed, no API calls
- Running cost log: "Processed 500/9978 — estimated $0.52 spent"
- `--budget 15` flag: hard-stop if estimated cost exceeds limit

## Progress Tracking

- Console output with per-company status
- State file: `scripts/.enrichment-progress.json`
- Metrics: processed, succeeded, failed, skipped, elapsed time, estimated remaining

## Total Cost Estimate

| Item | Tokens | Cost |
|------|--------|------|
| Pass 1: DeepSeek (9,978 companies) | ~30M in + ~20M out | ~$8-10 |
| Pass 2: Spider.cloud (1,500 pages) | N/A | ~$0.72 |
| Pass 2: Claude Haiku 4.5 (up to 1,500 companies) | ~4.5M in + ~3M out | ~$10-19 |
| **Total** | | **~$19-30** |

**Budget available:** ~$16.83 DeepSeek + ~$14.41 Anthropic = ~$31 total.

**Budget management strategy:**
- Pass 1 uses DeepSeek credits only. At ~$8-10, fits within $16.83 with margin.
- Pass 2 uses Anthropic credits only. The `--budget 14` flag hard-stops before exceeding $14.41.
- Pass 2 processes public companies first (highest SEO value), then top private by valuation, until budget runs out. This means we may get 900-1,500 quality reports depending on actual token usage.
- **If budget is tight:** Reduce Pass 2 input cap to 2,000 chars of Spider content, or reduce deep_report target to 1,000 words.
- **If Pass 1 DeepSeek costs come in higher than estimated:** Cap website content at 3,000 chars instead of 6,000.

## Dependencies

- `@supabase/supabase-js` — already installed
- `openai` SDK — already installed (used for DeepSeek)
- `@anthropic-ai/sdk` — already installed
- Spider.cloud API — new, HTTP-only (no SDK needed, just fetch)

## Environment Variables

Existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `ANTHROPIC_API_KEY`

New:
- `SPIDER_API_KEY` — from spider.cloud dashboard
