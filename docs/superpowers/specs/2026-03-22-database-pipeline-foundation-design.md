# Database & Data Pipeline Foundation — Design Spec

**Date:** 2026-03-22
**Scope:** New database tables, AI sector classification, Yahoo Finance stock price backfill, daily aggregation pipeline, GitHub Actions cron
**Depends on:** Existing `companies` table (11K rows, 861 with tickers), `sectors` table (20 sectors), `company_reports` table (700+ reports)
**Does NOT cover:** Frontend changes, pricing page, company page redesign, funding rounds extraction

---

## Context

BiotechTube is pivoting from a biotech company intelligence platform to a biotech financial market tracker. The core product is now about money flow: market indices, sector performance, stock charts, and funding tracking.

This spec covers the foundational data layer that everything else depends on. No frontend work is included — this is pure database schema + data pipeline.

### Current State
- 11K companies in `companies` table with names, countries, descriptions, categories, valuations
- 861 companies have ticker symbols (Yahoo Finance format: `MRNA`, `NYKD.OL`, `ALDVI.PA`, etc.) across 37 countries
- 20 sectors defined in `sectors` table but `company_count = 0` — no companies are mapped to sectors yet
- 700+ AI-generated deep reports in `company_reports` with therapeutic areas, descriptions, and financial mentions
- Companies have a `categories` TEXT[] column with tags like "Small Molecules", "Diagnostics", "Biologics" — partial overlap with sector definitions
- No historical price data tables exist
- No aggregation/index tables exist
- No daily cron jobs exist

### Target State
- Every company mapped to 1-3 sectors via `company_sectors` join table
- Full historical daily price data for all 861 public companies
- Daily snapshots of global index, sector indices, and country indices
- Automated daily pipeline via GitHub Actions

---

## 1. Database Schema

### 1.1 `company_sectors` (new table)

Many-to-many mapping between companies and sectors.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `company_id` | UUID | FK → companies.id, NOT NULL | |
| `sector_id` | UUID | FK → sectors.id, NOT NULL | |
| `is_primary` | BOOLEAN | NOT NULL, DEFAULT false | Exactly one per company |
| `confidence` | NUMERIC(3,2) | NOT NULL | 0.00–1.00, from AI classification |
| `classified_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Primary key:** `(company_id, sector_id)`
**Indexes:** `sector_id` (for sector page queries), `company_id` (for company page sector badges)
**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

### 1.2 `company_price_history` (new table)

Daily OHLCV stock data per company.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `company_id` | UUID | FK → companies.id, NOT NULL | |
| `ticker` | TEXT | NOT NULL | Denormalized for query convenience |
| `date` | DATE | NOT NULL | Trading day |
| `open` | NUMERIC | | |
| `high` | NUMERIC | | |
| `low` | NUMERIC | | |
| `close` | NUMERIC | | |
| `adj_close` | NUMERIC | NOT NULL | Split/dividend adjusted; primary value for charts |
| `volume` | BIGINT | | |
| `market_cap` | NUMERIC | | adj_close × shares_outstanding (when available) |
| `currency` | TEXT | NOT NULL, DEFAULT 'USD' | Native currency of the stock |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint:** `(company_id, date)`
**Indexes:**
- `(company_id, date DESC)` — chart queries (get price history for a company)
- `(date)` — daily aggregation (get all prices for a given day)
- `(date DESC, market_cap DESC NULLS LAST)` — top movers query

**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

**Estimated size:** 861 tickers × ~15 years avg × 252 trading days = ~3.3M rows. Well within Supabase free tier (500MB).

### 1.3 `market_snapshots` (new table)

Daily global biotech index values.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `date` | DATE | UNIQUE, NOT NULL | |
| `total_market_cap` | NUMERIC | NOT NULL | Sum of all public company market caps |
| `public_company_count` | INT | NOT NULL | Companies with price data on this date |
| `total_volume` | NUMERIC | | Sum of all volumes |
| `change_1d_pct` | NUMERIC | | vs previous trading day |
| `change_7d_pct` | NUMERIC | | vs 7 calendar days ago |
| `change_30d_pct` | NUMERIC | | vs 30 calendar days ago |
| `change_ytd_pct` | NUMERIC | | vs Jan 1 of current year |
| `top_gainer_id` | UUID | FK → companies.id | |
| `top_gainer_pct` | NUMERIC | | |
| `top_loser_id` | UUID | FK → companies.id | |
| `top_loser_pct` | NUMERIC | | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Index:** `date DESC` (latest snapshot query)
**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

### 1.4 `sector_market_data` (new table)

Daily per-sector aggregation.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `sector_id` | UUID | FK → sectors.id, NOT NULL | |
| `date` | DATE | NOT NULL | |
| `combined_market_cap` | NUMERIC | NOT NULL | Sum of member companies' market caps |
| `company_count` | INT | NOT NULL | Total companies in sector |
| `public_company_count` | INT | NOT NULL | Companies with price data |
| `total_volume` | NUMERIC | | |
| `change_1d_pct` | NUMERIC | | |
| `change_7d_pct` | NUMERIC | | |
| `change_30d_pct` | NUMERIC | | |
| `top_company_id` | UUID | FK → companies.id | Largest by market cap |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint:** `(sector_id, date)`
**Index:** `(sector_id, date DESC)` — sector chart queries
**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

### 1.5 `country_market_data` (new table)

Daily per-country aggregation.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `country` | TEXT | NOT NULL | Matches `companies.country` |
| `date` | DATE | NOT NULL | |
| `combined_market_cap` | NUMERIC | NOT NULL | |
| `company_count` | INT | NOT NULL | Total companies in country |
| `public_company_count` | INT | NOT NULL | |
| `total_volume` | NUMERIC | | |
| `change_1d_pct` | NUMERIC | | |
| `change_7d_pct` | NUMERIC | | |
| `change_30d_pct` | NUMERIC | | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Unique constraint:** `(country, date)`
**Index:** `(country, date DESC)` — country chart queries
**RLS:** Public SELECT, service_role INSERT/UPDATE/DELETE

---

## 2. AI Sector Classification

### Script: `scripts/classify-sectors.ts`

**Purpose:** Map all ~11K companies to 1-3 of the 20 defined sectors using Claude API.

**Input data per company:**
- `name`, `description`, `categories[]` from `companies` table
- `therapeutic_areas[]`, `technology_platform`, `summary` from `company_reports` (if exists)

**Classification prompt strategy:**
- Send companies in batches of 50 to Claude
- System prompt includes all 20 sector definitions with slugs
- Ask Claude to return JSON array: `[{ slug: string, sector_slug: string, is_primary: boolean, confidence: number }]`
- Each company gets 1-3 sector assignments; exactly one marked `is_primary`
- Confidence threshold: only insert mappings with confidence ≥ 0.5

**Execution details:**
- Batch size: 50 companies per API call
- Delay: 500ms between calls
- ~220 API calls total
- Estimated runtime: ~5-10 minutes
- Estimated cost: ~$2-5 (input tokens are small, output is structured JSON)
- Idempotent: skips companies that already have entries in `company_sectors`
- Progress logging: prints batch number, companies classified, errors

**Error handling:**
- If Claude returns invalid JSON for a batch, log and skip that batch
- If a sector slug doesn't match our 20 sectors, log and skip that mapping
- Retry failed batches once before skipping

**Post-classification update:**
- After classification completes, update `sectors` table denormalized counts:
  - `company_count` = count of companies in that sector
  - `public_company_count` = count of companies in that sector that have a ticker

---

## 3. Stock Price Backfill

### Script: `scripts/backfill-prices.ts`

**Purpose:** Fetch full historical daily price data for all 861 tickers using `yahoo-finance2`.

**Dependencies:** `yahoo-finance2` npm package (to be added)

**Process:**
1. Query all companies with non-null, non-empty `ticker` from DB
2. For each company, check latest date in `company_price_history`
   - If no data: fetch from earliest available (`period1: '1990-01-01'`)
   - If has data: fetch from latest date + 1 day (incremental)
3. Call `yahooFinance.historical(ticker, { period1, period2: 'today' })`
4. Map Yahoo response to DB rows:
   - `open`, `high`, `low`, `close` from Yahoo fields
   - `adj_close` from Yahoo's `adjClose`
   - `volume` from Yahoo
   - `currency` from quote metadata
   - `market_cap`: not available in historical endpoint — will be calculated in daily update for current day only
5. Batch insert into `company_price_history` (upsert on `(company_id, date)`)

**Concurrency:**
- Worker pool: 5 concurrent fetches
- Delay between dispatches: 500ms
- Estimated per-ticker time: 3-8 seconds (depends on history length)
- Total estimated runtime: 60-90 minutes for full backfill

**Error handling:**
- Invalid ticker / delisted: log warning, continue
- Rate limiting: exponential backoff (1s, 2s, 4s, 8s) up to 3 retries
- Network errors: retry once, then skip and log
- Summary at end: X tickers succeeded, Y failed, Z total rows inserted

**Ticker format handling:**
- Yahoo Finance format is already used in DB (e.g., `NYKD.OL`, `ALDVI.PA`, `OXB.L`)
- No translation needed

---

## 4. Daily Update Pipeline

### Script: `scripts/daily-update.ts`

**Purpose:** Run once daily to fetch latest prices and calculate all indices/aggregations.

**Step 1: Fetch latest prices** (~5-10 min)
- Same logic as backfill but only fetches last 5 trading days (to catch any gaps from weekends/holidays)
- Upserts into `company_price_history`
- Also fetches current market cap via `yahooFinance.quote(ticker)` for each company
- Updates `companies.valuation` with latest market cap

**Step 2: Calculate market snapshot** (~10 sec)
- Get all companies' latest market caps from today's `company_price_history`
- Sum → `total_market_cap`
- Count → `public_company_count`
- Sum volumes → `total_volume`
- Find top gainer: company with highest % change vs previous close
- Find top loser: company with lowest % change vs previous close
- Calculate % changes:
  - `change_1d_pct`: compare to previous day's snapshot
  - `change_7d_pct`: compare to snapshot from 7 days ago
  - `change_30d_pct`: compare to snapshot from 30 days ago
  - `change_ytd_pct`: compare to Jan 1 snapshot
- Upsert into `market_snapshots` on `date`

**Step 3: Calculate sector data** (~10 sec)
- For each sector:
  - Join `company_sectors` → `company_price_history` (latest date)
  - Sum market caps of member companies
  - Count companies
  - Calculate % changes vs previous sector snapshot
  - Find top company by market cap
- Upsert into `sector_market_data` on `(sector_id, date)`

**Step 4: Calculate country data** (~10 sec)
- For each country that has public companies:
  - Filter `company_price_history` (latest date) by country
  - Sum market caps
  - Count companies
  - Calculate % changes vs previous country snapshot
- Upsert into `country_market_data` on `(country, date)`

**Step 5: Update denormalized fields** (~5 sec)
- Update `sectors` table: `company_count`, `public_company_count`, `combined_market_cap`
- Update `companies.valuation` with latest market cap (already done in step 1)

**Total estimated runtime:** 8-15 minutes

---

## 5. Historical Aggregation Backfill

### Script: `scripts/backfill-aggregations.ts`

**Purpose:** After price history is backfilled, retroactively calculate historical `market_snapshots`, `sector_market_data`, and `country_market_data` so that index charts have full history from day one.

**Process:**
1. Find the earliest date in `company_price_history`
2. For each trading day from earliest to today:
   - Run the same aggregation logic as daily update steps 2-4
   - Insert into `market_snapshots`, `sector_market_data`, `country_market_data`
3. This creates the full historical index that the homepage chart will display

**Estimated scope:** ~15 years × 252 trading days = ~3,780 days to process. Each day requires a few queries. Total runtime: 15-30 minutes.

**Dependency:** Requires both `company_price_history` AND `company_sectors` to be populated first.

---

## 6. GitHub Actions Workflow

### File: `.github/workflows/daily-market-data.yml`

```yaml
name: Daily Market Data Update
on:
  schedule:
    - cron: '0 6 * * 1-5'  # 06:00 UTC, weekdays only (markets closed weekends)
  workflow_dispatch: {}      # Manual trigger for testing
jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsx scripts/daily-update.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

**Schedule:** Weekdays only at 06:00 UTC
- US markets close at 21:00 ET (01:00-02:00 UTC)
- Asian markets close around 08:00-09:00 UTC
- 06:00 UTC catches end-of-day data for US and European markets
- Some Asian market data may be from previous day — acceptable for daily snapshots

**Secrets required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 7. Schema Migration Script

### File: `scripts/run-pivot-schema.ts`

Follows the existing pattern of `scripts/run-schema.ts`. Executes raw SQL against Supabase to create all 5 new tables with indexes, constraints, and RLS policies.

Idempotent: uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

---

## 8. New npm Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `yahoo-finance2` | Stock price data fetching | `^2.x` |

No other new dependencies required. Claude API (`@anthropic-ai/sdk`) is already installed for sector classification.

---

## 9. Execution Order

```
1. run-pivot-schema.ts          → Creates 5 new tables
2. classify-sectors.ts          → Maps 11K companies to sectors (~10 min)
3. backfill-prices.ts           → Fetches historical prices for 861 tickers (~90 min)
4. backfill-aggregations.ts     → Calculates historical indices (~30 min)
5. Set up GitHub Actions secrets
6. Enable daily-market-data.yml → Automated daily updates
```

Steps 2 and 3 can run in parallel (independent data). Step 4 depends on both 2 and 3 completing.

---

## 10. Verification

After pipeline completion, verify with these queries:

```sql
-- Sector classification coverage
SELECT COUNT(DISTINCT company_id) FROM company_sectors;
-- Expected: ~11,000

-- Price history coverage
SELECT COUNT(DISTINCT company_id) FROM company_price_history;
-- Expected: ~861

-- Total price rows
SELECT COUNT(*) FROM company_price_history;
-- Expected: ~2-4M

-- Market snapshots
SELECT COUNT(*) FROM market_snapshots;
-- Expected: ~3,000-4,000 (15+ years of trading days)

-- Sector data
SELECT s.name, smd.combined_market_cap, smd.company_count
FROM sector_market_data smd
JOIN sectors s ON s.id = smd.sector_id
WHERE smd.date = CURRENT_DATE
ORDER BY smd.combined_market_cap DESC;
-- Expected: 20 rows with non-zero market caps

-- Country data
SELECT country, combined_market_cap, public_company_count
FROM country_market_data
WHERE date = CURRENT_DATE
ORDER BY combined_market_cap DESC
LIMIT 10;
-- Expected: US at top, followed by major biotech countries
```

---

## Out of Scope

- Frontend changes (homepage dashboard, sector pages, company page simplification)
- Funding rounds extraction from reports
- Real-time price streaming
- Authentication / subscription gating
- Email campaigns
- Pricing page updates
